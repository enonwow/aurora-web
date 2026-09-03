import { describe, expect, it, vi } from "vitest";
import {
  AreaApiRequestError,
  HttpAreaApiPort
} from "../../../../src/modules/areas/adapters/httpAreaApiPort";
import { effectiveAreaAudioCatalogBundle } from "./areaAudioCatalogFixture";
import { effectiveAreaLoadingScreenCatalog } from "./areaLoadingScreenCatalogFixture";

describe("HttpAreaApiPort", () => {
  it("accepts and clones one complete exact Door transition storage trio", async () => {
    const storage = { linkedTo: "DESTINATION_TAG", linkedToFlags: 2, loadScreenId: 7 };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaWithDoorTransitionStorage(storage),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_door_transition");

    expect(area.objects[0]?.doorTransition?.storage).toEqual(storage);
    expect(area.objects[0]?.doorTransition?.storage).not.toBe(storage);
  });

  it.each([-1, 0, 1, 32_000] as const)(
    "maps exact retained Encounter Respawns INT %i without coercion",
    async (respawns) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "encounter:0:respawns",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "x2_gnoll001",
          encounterRespawns: { respawns },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_encounter_respawns");
      expect(area.objects[0]?.encounterRespawns).toStrictEqual({ respawns });
    },
  );

  it.each([
    ["non-Encounter owner", "trigger", { respawns: 0 }],
    ["missing value", "encounter", {}],
    ["below sentinel", "encounter", { respawns: -2 }],
    ["above maximum", "encounter", { respawns: 32_001 }],
    ["fraction", "encounter", { respawns: 0.5 }],
    ["string alias", "encounter", { respawns: "-1" }],
    ["unexpected key", "encounter", { respawns: 0, extra: true }],
  ])("rejects Encounter Respawns storage with %s", async (
    _label,
    kind,
    encounterRespawns,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:respawns_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterRespawns,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_respawns_bad"))
      .rejects.toThrow();
  });

  it("maps one exact retained Encounter creature-count pair without coercion", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:creature_counts",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "x2_gnoll001",
        encounterCreatureCounts: { maxCreatures: 4, recCreatures: 2 },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_encounter_creature_counts");
    expect(area.objects[0]?.encounterCreatureCounts)
      .toStrictEqual({ maxCreatures: 4, recCreatures: 2 });
  });

  it("maps one complete exact retained Encounter event-script tuple without coercion", async () => {
    const scripts = {
      onEntered: "Enc_Enter",
      onExit: "enc_exit",
      onExhausted: "",
      onHeartbeat: "enc_heartbeat",
      onUserDefined: "enc_user",
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:scripts",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "x2_gnoll001",
        encounterScriptResRefs: scripts,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    const area = await port.getAreaById("token", "area_encounter_scripts");
    expect(area.objects[0]?.encounterScriptResRefs).toStrictEqual(scripts);
    expect(area.objects[0]?.encounterScriptResRefs).not.toBe(scripts);
  });

  it("maps one complete exact retained Trigger event-script tuple without coercion", async () => {
    const scripts = {
      onDisarm: "TRG_DISARM",
      onTrapTriggered: "trg_trapped",
      onClick: "",
      onHeartbeat: "trg_heartbeat",
      onEnter: "trg_enter",
      onExit: "trg_exit",
      onUserDefined: "trg_user",
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "trigger:0:scripts",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        triggerScriptResRefs: scripts,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    const area = await port.getAreaById("token", "area_trigger_scripts");
    expect(area.objects[0]?.triggerScriptResRefs).toStrictEqual(scripts);
    expect(area.objects[0]?.triggerScriptResRefs).not.toBe(scripts);
  });

  it("maps exact Trigger transition storage into a detached response", async () => {
    const storage = { linkedTo: "east_gate", linkedToFlags: 2, loadScreenId: 321 };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "trigger:0:transition",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        triggerTransitionStorage: storage,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_trigger_transition");

    expect(area.objects[0]?.triggerTransitionStorage).toStrictEqual(storage);
    expect(area.objects[0]?.triggerTransitionStorage).not.toBe(storage);
  });

  it("maps exact Encounter Faction DWord storage with the shared module catalog", async () => {
    const factionCatalog = {
      descriptor: {
        resourceName: "repute.fac",
        sourceObjectKey: "modules/current/repute.fac",
        sha256: "f".repeat(64),
        sizeBytes: 1889,
        factionCount: 5,
      },
      rows: [
        { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 3, name: "Merchant", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 4, name: "Defender", parentFactionId: 0xffffffff, isGlobal: true },
      ],
    };
    const raw = { present: true, nativeType: "dword", value: 1 } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        ...areaDetailWithObject({
          objectId: "encounter:0:faction",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "x2_gnoll001",
          encounterFaction: raw,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
        placeableFactionCatalog: factionCatalog,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_encounter_faction");
    expect(area.placeableFactionCatalog).toEqual(factionCatalog);
    expect(area.objects[0]?.encounterFaction).toEqual(raw);
    expect(area.objects[0]?.encounterFaction).not.toBe(raw);
  });

  it("maps the exact Encounter Difficulty INT pair with its effective catalog", async () => {
    const difficultyCatalog = {
      schemaVersion: "area-encounter-difficulty-catalog.v1",
      descriptor: {
        resourceName: "encdifficulty.2da",
        sourceObjectKey: "modules/current/encdifficulty.2da",
        sourceLayer: "module",
        sha256: "d".repeat(64),
        sizeBytes: 256,
        rowCount: 5,
      },
      rows: [-2, -1, 1, 2, 3].map((value, rowIndex) => ({
        rowIndex,
        strRef: 1000 + rowIndex,
        value,
        displayName: `Difficulty ${rowIndex}`,
        displaySource: "strref",
      })),
    };
    const raw = {
      difficulty: { present: true, nativeType: "int", value: 1 },
      difficultyIndex: { present: true, nativeType: "int", value: 2 },
    } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        ...areaDetailWithObject({
          objectId: "encounter:0:difficulty",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "x2_gnoll001",
          encounterDifficulty: raw,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
        encounterDifficultyCatalog: difficultyCatalog,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_encounter_difficulty");
    expect(area.encounterDifficultyCatalog).toEqual(difficultyCatalog);
    expect(area.encounterDifficultyCatalog).not.toBe(difficultyCatalog);
    expect(area.objects[0]?.encounterDifficulty).toEqual(raw);
    expect(area.objects[0]?.encounterDifficulty).not.toBe(raw);
  });

  it("maps complete Encounter LocalizedName storage without aliasing", async () => {
    const raw = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
    } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:name",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "x2_gnoll001",
        encounterLocalizedName: raw,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_encounter_name");
    expect(area.objects[0]?.encounterLocalizedName).toEqual(raw);
    expect(area.objects[0]?.encounterLocalizedName).not.toBe(raw);
    if (area.objects[0]?.encounterLocalizedName?.present) {
      expect(area.objects[0].encounterLocalizedName.entries).not.toBe(raw.entries);
    }
  });

  it("maps complete Trigger LocalizedName storage without aliasing", async () => {
    const raw = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
    } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "trigger:0:name",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        triggerLocalizedName: raw,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_trigger_name");
    expect(area.objects[0]?.triggerLocalizedName).toEqual(raw);
    expect(area.objects[0]?.triggerLocalizedName).not.toBe(raw);
    if (area.objects[0]?.triggerLocalizedName?.present) {
      expect(area.objects[0].triggerLocalizedName.entries).not.toBe(raw.entries);
    }
  });

  it("maps exact Trigger paired-GIC editor Comment metadata as a detached value", async () => {
    const triggerMetadata = { editorComment: "  gate\r\nnote  ", opaque: 7 };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "trigger:0:comment",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        triggerMetadata,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_trigger_comment");

    expect(area.objects[0]?.triggerMetadata).toEqual(triggerMetadata);
    expect(area.objects[0]?.triggerMetadata).not.toBe(triggerMetadata);
  });

  it.each([
    ["non-string value", 7, "trigger"],
    ["embedded NUL", "invalid\u0000comment", "trigger"],
    ["overlong value", "x".repeat(4097), "trigger"],
    ["non-Trigger owner", "valid comment", "encounter"],
  ])("rejects a Trigger editor Comment with %s at the HTTP boundary", async (
    _label,
    editorComment,
    kind,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "trigger:0:comment_bad",
        sourceIndex: 0,
        kind,
        templateId: "newgeneric",
        triggerMetadata: { editorComment },
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_trigger_comment_bad"))
      .rejects.toThrow();
  });

  it("maps exact ordered Encounter CreatureList provenance without aliasing", async () => {
    const raw = { expectedEntries: [
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
    ] } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:creature_list",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "x2_gnoll001",
        encounterCreatureList: raw,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_encounter_creature_list");
    expect(area.objects[0]?.encounterCreatureList).toEqual(raw);
    expect(area.objects[0]?.encounterCreatureList).not.toBe(raw);
    expect(area.objects[0]?.encounterCreatureList?.expectedEntries)
      .not.toBe(raw.expectedEntries);
  });

  it("maps exact ordered Encounter SpawnPointList provenance without aliasing", async () => {
    const raw = { expectedEntries: [
      {
        sourceIndex: 0,
        nativeX: 22.5,
        nativeY: 45.25,
        nativeZ: 0,
        orientation: 1.5,
      },
      {
        sourceIndex: 1,
        nativeX: -3.75,
        nativeY: 9.5,
        nativeZ: 0.125,
        orientation: -2.25,
      },
    ] } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:spawn_points",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "x2_gnoll001",
        encounterSpawnPoints: raw,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_encounter_spawn_points");
    expect(area.objects[0]?.encounterSpawnPoints).toEqual(raw);
    expect(area.objects[0]?.encounterSpawnPoints).not.toBe(raw);
    expect(area.objects[0]?.encounterSpawnPoints?.expectedEntries)
      .not.toBe(raw.expectedEntries);
  });

  it.each([
    ["wrong owner", "trigger", { expectedEntries: [] }],
    ["non-float32 coordinate", "encounter", { expectedEntries: [{
      sourceIndex: 0,
      nativeX: 0.1,
      nativeY: 0,
      nativeZ: 0,
      orientation: 0,
    }] }],
  ])("rejects Encounter SpawnPointList provenance with %s", async (
    _label,
    kind,
    encounterSpawnPoints,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:spawn_points_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterSpawnPoints,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_spawn_points_bad"))
      .rejects.toThrow();
  });

  it.each([
    ["wrong owner", "trigger", { expectedEntries: [] }],
    ["non-contiguous index", "encounter", { expectedEntries: [{
      sourceIndex: 1, appearance: 388, challengeRating: 1,
      resRef: "nw_gnoll001", singleSpawnByte: 0,
    }] }],
    ["non-float32 CR", "encounter", { expectedEntries: [{
      sourceIndex: 0, appearance: 388, challengeRating: 0.1,
      resRef: "nw_gnoll001", singleSpawnByte: 0,
    }] }],
    ["invalid SingleSpawn byte", "encounter", { expectedEntries: [{
      sourceIndex: 0, appearance: 388, challengeRating: 1,
      resRef: "nw_gnoll001", singleSpawnByte: 2,
    }] }],
  ])("rejects Encounter CreatureList provenance with %s", async (
    _label,
    kind,
    encounterCreatureList,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:creature_list_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterCreatureList,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_creature_list_bad"))
      .rejects.toThrow();
  });

  it.each([
    ["partial", { linkedTo: "DESTINATION_TAG", linkedToFlags: 2 }],
    ["unknown member", {
      linkedTo: "DESTINATION_TAG", linkedToFlags: 2, loadScreenId: 7, extra: true,
    }],
    ["out-of-range flags", { linkedTo: "DESTINATION_TAG", linkedToFlags: 256, loadScreenId: 7 }],
    ["out-of-range load screen", {
      linkedTo: "DESTINATION_TAG", linkedToFlags: 2, loadScreenId: 65_536,
    }],
  ])("rejects %s Door transition storage at the HTTP boundary", async (_label, storage) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaWithDoorTransitionStorage(storage),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_door_transition")).rejects.toThrow();
  });

  it("accepts and maps one complete ordered Area Name entry list", async () => {
    const nameEntries = [
      { languageId: 2, text: "Alternate" },
      { languageId: 0, text: "Exact Name" },
    ];
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaWithBasicIdentity({
        name: "Exact Name",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_basic_identity");
    expect(area.basicIdentity?.nameEntries).toEqual(nameEntries);
    expect(area.basicIdentity?.nameEntries).not.toBe(nameEntries);
  });

  it.each([
    ["duplicate identifiers", {
      name: "Exact Name", nameProfile: "multi_entry_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Exact Name" }, { languageId: 0, text: "Duplicate" }],
    }],
    ["profile/list mismatch", {
      name: "Exact Name", nameProfile: "simple_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Exact Name" }, { languageId: 2, text: "Other" }],
    }],
    ["default text mismatch", {
      name: "Exact Name", nameProfile: "multi_entry_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Different" }, { languageId: 2, text: "Other" }],
    }],
    ["missing profile", {
      name: "Exact Name",
      nameEntries: [{ languageId: 0, text: "Exact Name" }, { languageId: 2, text: "Other" }],
    }],
  ])("rejects Area Name entries with %s at the HTTP boundary", async (_label, basicIdentity) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaWithBasicIdentity(basicIdentity),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_basic_identity")).rejects.toThrow();
  });

  it("accepts and clones one exact all-or-nothing effective Area audio catalog bundle", async () => {
    const catalogs = effectiveAreaAudioCatalogBundle();
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_audio_catalog_probe",
      name: "Audio Catalog Probe",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      audioEnvironmentCatalogs: catalogs,
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
      updatedAt: "2026-08-22T00:00:00.000Z",
      objects: [],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_audio_catalog_probe");
    expect(area.audioEnvironmentCatalogs).toEqual(catalogs);
    expect(area.audioEnvironmentCatalogs).not.toBe(catalogs);
    expect(area.audioEnvironmentCatalogs?.ambientMusic.rows).not.toBe(catalogs.ambientMusic.rows);
  });

  it("accepts and deeply clones one exact effective Area loading-screen catalog", async () => {
    const catalog = effectiveAreaLoadingScreenCatalog();
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_loading_screen_catalog_probe",
      name: "Loading Screen Catalog Probe",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      loadingScreenCatalog: catalog,
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
      updatedAt: "2026-08-24T00:00:00.000Z",
      objects: [],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_loading_screen_catalog_probe");
    expect(area.loadingScreenCatalog).toEqual(catalog);
    expect(area.loadingScreenCatalog).not.toBe(catalog);
    expect(area.loadingScreenCatalog?.rows[0]?.imageAsset)
      .not.toBe(catalog.rows[0]?.imageAsset);
  });

  it("rejects an inexact Area loading-screen catalog at the HTTP boundary", async () => {
    const catalog = effectiveAreaLoadingScreenCatalog();
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_loading_screen_catalog_invalid",
      name: "Loading Screen Catalog Invalid",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      loadingScreenCatalog: { ...catalog, rows: catalog.rows.map((row, index) =>
        index === 1 ? { ...row, rowIndex: 7 } : row) },
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
      updatedAt: "2026-08-24T00:00:00.000Z",
      objects: [],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.getAreaById("token", "area_loading_screen_catalog_invalid"))
      .rejects.toThrow();
  });

  it("rejects a partial or resource-incoherent Area audio catalog bundle", async () => {
    const catalogs = effectiveAreaAudioCatalogBundle();
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_audio_catalog_invalid",
      name: "Audio Catalog Invalid",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      audioEnvironmentCatalogs: {
        ...catalogs,
        ambientMusic: {
          ...catalogs.ambientMusic,
          descriptor: {
            ...catalogs.ambientMusic.descriptor,
            resourceName: "ambientsound.2da",
          },
        },
      },
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
      updatedAt: "2026-08-22T00:00:00.000Z",
      objects: [],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.getAreaById("token", "area_audio_catalog_invalid")).rejects.toThrow();
  });

  it("accepts and maps one complete exact Area audio-environment tuple", async () => {
    const audioEnvironment = {
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
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_audio_probe",
        name: "Audio Probe",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        audioEnvironment,
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
        composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
        updatedAt: "2026-08-22T00:00:00.000Z",
        objects: [],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_audio_probe")).resolves.toMatchObject({
      audioEnvironment,
    });
  });

  it("rejects a partial or out-of-range Area audio-environment tuple", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_audio_invalid",
      name: "Audio Invalid",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      audioEnvironment: {
        ambientSoundDayId: 41,
        ambientSoundNightId: 42,
        ambientSoundDayVolume: 128,
      },
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
      updatedAt: "2026-08-22T00:00:00.000Z",
      objects: [],
    }}), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    await expect(port.getAreaById("token", "area_audio_invalid")).rejects.toThrow();
  });

  it.each([
    { sourceObjectKey: "x".repeat(2049) },
    { sourceLayer: "external_fixture" },
    { sha256: "A".repeat(64) },
    { sha256: `x${"a".repeat(64)}` },
    { sha256: `${"a".repeat(64)}x` },
    { sizeBytes: 0 },
    { sizeBytes: 64 * 1024 * 1024 + 1 },
    { rowCount: 0 },
    { rowCount: 1_000_001 },
    { rowIndex: 0 },
    { rowCount: 104, rowIndex: 104 },
    { extra: true },
  ])("rejects malformed effective placeables.2da provenance at the HTTP boundary %#", async (override) => {
    const table = {
      resourceName: "placeables.2da",
      sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
      sourceLayer: "hak",
      sha256: "a".repeat(64),
      sizeBytes: 8192,
      rowCount: 16500,
      rowIndex: 104,
      ...override,
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_invalid_table",
        name: "Invalid Table",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: {
          atlasId: "atlas_invalid_table",
          cacheKey: "atlas_invalid_table:1x1",
          strategy: "blob-cache",
        },
        composition: {
          placeables: 1,
          doors: 0,
          creatures: 0,
          items: 0,
          sounds: 0,
          total: 1,
        },
        updatedAt: "2026-08-17T16:45:00.000Z",
        objects: [{
          objectId: "plc:0:invalid_table",
          kind: "placeable",
          templateId: "plc_invalid_table",
          placeableBasicIdentity: {
            tag: { present: false },
            appearance: { present: true, nativeType: "dword", value: 104, table },
          },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.getAreaById("token", "area_invalid_table")).rejects.toThrow();
  });

  it.each([
    (value: any) => { value.extra = true; },
    (value: any) => { value.locName.extra = true; },
    (value: any) => { value.locName.entries[0].extra = true; },
    (value: any) => { value.locName.entries[0].textBytesBase64 = "A"; },
    (value: any) => { value.locName.entries = Array.from({ length: 65 }, () => ({ languageId: 0, textBytesBase64: "" })); },
  ])("rejects malformed Placeable localized-string provenance at the HTTP boundary %#", async (mutate) => {
    const placeableLocalizedStrings: any = {
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }],
      },
      description: { present: false },
    };
    mutate(placeableLocalizedStrings);
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_invalid_locstring",
        name: "Invalid LocString",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: {
          atlasId: "atlas_invalid_locstring",
          cacheKey: "atlas_invalid_locstring:1x1",
          strategy: "blob-cache",
        },
        composition: {
          placeables: 1,
          doors: 0,
          creatures: 0,
          encounters: 0,
          items: 0,
          sounds: 0,
          stores: 0,
          triggers: 0,
          waypoints: 0,
          total: 1,
        },
        updatedAt: "2026-08-19T00:00:00.000Z",
        objects: [{
          objectId: "plc:0:invalid_locstring",
          kind: "placeable",
          templateId: "plc_invalid_locstring",
          placeableLocalizedStrings,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.getAreaById("token", "area_invalid_locstring")).rejects.toThrow();
  });

  it("maps exact absent Placeable localized-string members without materializing values", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_absent_locstring",
        name: "Absent LocString",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: {
          atlasId: "atlas_absent_locstring",
          cacheKey: "atlas_absent_locstring:1x1",
          strategy: "blob-cache",
        },
        composition: {
          placeables: 1,
          doors: 0,
          creatures: 0,
          encounters: 0,
          items: 0,
          sounds: 0,
          stores: 0,
          triggers: 0,
          waypoints: 0,
          total: 1,
        },
        updatedAt: "2026-08-19T00:00:00.000Z",
        objects: [{
          objectId: "plc:0:absent_locstring",
          kind: "placeable",
          templateId: "plc_absent_locstring",
          placeableLocalizedStrings: {
            locName: { present: false },
            description: { present: false },
          },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_absent_locstring");
    expect(area.objects[0]?.placeableLocalizedStrings).toEqual({
      locName: { present: false },
      description: { present: false },
    });
  });

  it("maps Creature identity, flags, and FirstName/LastName/Description without dropping provenance", async () => {
    const creatureLocalizedStrings = {
      firstName: { present: true, strRef: 12_416, entries: [] },
      lastName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, textBytesBase64: "IEd1YXJkIA==" },
          { languageId: 0, textBytesBase64: "" },
        ],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "RGVzY3JpcHRpb24=" }],
      },
    };
    const creatureAdvancedFlags = {
      disarmable: { present: true, value: 1 as const },
      plot: { present: true, value: 0 as const },
      immortal: { present: false as const },
      lootable: { present: true, value: 1 as const },
      noPermanentDeath: { present: true, value: 0 as const },
    };
    const creatureBodyBag = { present: true, nativeType: "byte" as const, value: 2 };
    const creatureDecayTime = {
      present: true,
      nativeType: "dword" as const,
      valueMilliseconds: 12_000,
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureTag: { present: true, value: "  NW_CHICKEN  " },
        creatureConversation: { present: true, value: "Guard_Dialog" },
        creatureInterruptable: { present: true, value: 0 },
        creatureAdvancedFlags,
        creatureBodyBag,
        creatureDecayTime,
        creatureLocalizedStrings,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_names");
    expect(area.objects[0]?.creatureTag).toEqual({ present: true, value: "  NW_CHICKEN  " });
    expect(area.objects[0]?.creatureConversation).toEqual({
      present: true,
      value: "Guard_Dialog",
    });
    expect(area.objects[0]?.creatureInterruptable).toEqual({ present: true, value: 0 });
    expect(area.objects[0]?.creatureAdvancedFlags).toEqual(creatureAdvancedFlags);
    expect(area.objects[0]?.creatureAdvancedFlags).not.toBe(creatureAdvancedFlags);
    expect(area.objects[0]?.creatureAdvancedFlags?.plot).not.toBe(creatureAdvancedFlags.plot);
    expect(area.objects[0]?.creatureBodyBag).toEqual(creatureBodyBag);
    expect(area.objects[0]?.creatureBodyBag).not.toBe(creatureBodyBag);
    expect(area.objects[0]?.creatureDecayTime).toEqual(creatureDecayTime);
    expect(area.objects[0]?.creatureDecayTime).not.toBe(creatureDecayTime);
    expect(area.objects[0]?.creatureLocalizedStrings).toEqual(creatureLocalizedStrings);
    expect(area.objects[0]?.creatureLocalizedStrings).not.toBe(creatureLocalizedStrings);
    expect(area.objects[0]?.creatureLocalizedStrings?.lastName).not.toBe(
      creatureLocalizedStrings.lastName,
    );
    expect(area.objects[0]?.creatureLocalizedStrings?.description).not.toBe(
      creatureLocalizedStrings.description,
    );
  });

  it("maps exact digest-bound Creature Appearance storage without sharing its table", async () => {
    const creatureAppearance = {
      present: true as const,
      nativeType: "word" as const,
      value: 249,
      table: {
        resourceName: "appearance.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 200_000,
        rowCount: 1_000,
        rowIndex: 249,
      },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureAppearance,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_appearance");

    expect(area.objects[0]?.creatureAppearance).toEqual(creatureAppearance);
    expect(area.objects[0]?.creatureAppearance).not.toBe(creatureAppearance);
    expect(area.objects[0]?.creatureAppearance?.present &&
      area.objects[0].creatureAppearance.table).not.toBe(creatureAppearance.table);
  });

  it("maps exact digest-bound Creature WalkRate:Int storage without sharing its table", async () => {
    const creatureWalkRate = {
      present: true as const,
      nativeType: "int" as const,
      value: 4,
      table: {
        resourceName: "creaturespeed.2da" as const,
        sourceObjectKey: "runtime-source/module/creaturespeed.2da",
        sourceLayer: "module" as const,
        sha256: "f".repeat(64),
        sizeBytes: 4_096,
        rowCount: 9,
        rowIndex: 4,
        twoDaName: "NORM",
      },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_guard",
        kind: "creature",
        templateId: "nw_guard",
        creatureWalkRate,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_walk_rate");

    expect(area.objects[0]?.creatureWalkRate).toEqual(creatureWalkRate);
    expect(area.objects[0]?.creatureWalkRate).not.toBe(creatureWalkRate);
    expect(area.objects[0]?.creatureWalkRate?.present &&
      area.objects[0].creatureWalkRate.table).not.toBe(creatureWalkRate.table);
  });

  it("maps exact digest-bound Creature SoundSetFile:Word storage without sharing its table", async () => {
    const creatureSoundSetFile = {
      present: true as const,
      nativeType: "word" as const,
      value: 0,
      table: {
        resourceName: "soundset.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 336_678,
        rowCount: 5_100,
        rowIndex: 0,
        resRef: "c_aasimar",
      },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_guard",
        kind: "creature",
        templateId: "nw_guard",
        creatureSoundSetFile,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_sound_set");

    expect(area.objects[0]?.creatureSoundSetFile).toEqual(creatureSoundSetFile);
    expect(area.objects[0]?.creatureSoundSetFile).not.toBe(creatureSoundSetFile);
    expect(area.objects[0]?.creatureSoundSetFile?.present &&
      area.objects[0].creatureSoundSetFile.table).not.toBe(creatureSoundSetFile.table);
  });

  it("maps exact ClassList- and digest-bound Creature StartingPackage:Byte storage deeply", async () => {
    const creatureStartingPackage = {
      present: true as const,
      nativeType: "byte" as const,
      value: 0,
      classIds: [4],
      table: {
        resourceName: "packages.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
        rowIndex: 0,
        classId: 4,
      },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_guard",
        kind: "creature",
        templateId: "nw_guard",
        creatureStartingPackage,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_starting_package");

    expect(area.objects[0]?.creatureStartingPackage).toEqual(creatureStartingPackage);
    expect(area.objects[0]?.creatureStartingPackage).not.toBe(creatureStartingPackage);
    if (area.objects[0]?.creatureStartingPackage?.present) {
      expect(area.objects[0].creatureStartingPackage.classIds).not.toBe(
        creatureStartingPackage.classIds,
      );
      expect(area.objects[0].creatureStartingPackage.table).not.toBe(
        creatureStartingPackage.table,
      );
    }
  });

  it("maps exact digest-bound Creature Gender storage without sharing its table", async () => {
    const creatureGender = {
      present: true as const,
      nativeType: "byte" as const,
      value: 4,
      table: {
        resourceName: "gender.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 250,
        rowCount: 5,
        rowIndex: 4,
      },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureGender,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_gender");

    expect(area.objects[0]?.creatureGender).toEqual(creatureGender);
    expect(area.objects[0]?.creatureGender).not.toBe(creatureGender);
    expect(area.objects[0]?.creatureGender?.present &&
      area.objects[0].creatureGender.table).not.toBe(creatureGender.table);
  });

  it("maps exact Creature PortraitId storage, context, table, and catalog without sharing", async () => {
    const descriptor = {
      resourceName: "portraits.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
      sourceLayer: "vanilla" as const,
      sha256: "f".repeat(64),
      sizeBytes: 100_000,
      rowCount: 16_001,
    };
    const creaturePortrait = {
      present: true as const,
      nativeType: "word" as const,
      value: 10,
      selectorContext: { genderValue: 0, raceValue: 4 },
      table: { ...descriptor, rowIndex: 10, baseResRef: "po_hm_guard" },
    };
    const creaturePortraitCatalog = {
      descriptor,
      rows: [
        { rowIndex: 10, baseResRef: "po_hm_guard", sex: 0, race: 6, plot: 0 },
        { rowIndex: 11, baseResRef: "po_em_guard", sex: 0, race: 1, plot: 0 },
      ],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        ...areaDetailWithObject({
          objectId: "creature:0:nw_chicken",
          kind: "creature",
          templateId: "nw_chicken",
          creaturePortrait,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
        creaturePortraitCatalog,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_portrait");

    expect(area.objects[0]?.creaturePortrait).toEqual(creaturePortrait);
    expect(area.objects[0]?.creaturePortrait).not.toBe(creaturePortrait);
    expect(area.objects[0]?.creaturePortrait?.present &&
      area.objects[0].creaturePortrait.selectorContext).not.toBe(
        creaturePortrait.selectorContext,
      );
    expect(area.creaturePortraitCatalog).toEqual(creaturePortraitCatalog);
    expect(area.creaturePortraitCatalog).not.toBe(creaturePortraitCatalog);
    expect(area.creaturePortraitCatalog?.rows).not.toBe(creaturePortraitCatalog.rows);
  });

  it("maps exact digest-bound Creature Phenotype Int storage without sharing its table", async () => {
    const creaturePhenotype = {
      present: true as const,
      nativeType: "int" as const,
      value: 5,
      table: {
        resourceName: "phenotype.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/phenotype.2da",
        sourceLayer: "vanilla" as const,
        sha256: "d".repeat(64),
        sizeBytes: 337,
        rowCount: 9,
        rowIndex: 5,
      },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creaturePhenotype,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_phenotype");

    expect(area.objects[0]?.creaturePhenotype).toEqual(creaturePhenotype);
    expect(area.objects[0]?.creaturePhenotype).not.toBe(creaturePhenotype);
    expect(area.objects[0]?.creaturePhenotype?.present &&
      area.objects[0].creaturePhenotype.table).not.toBe(creaturePhenotype.table);
  });

  it("maps exact Creature ChallengeRating Float storage without sharing the payload", async () => {
    const creatureChallengeRating = {
      present: true as const,
      nativeType: "float" as const,
      value: Math.fround(0.1),
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureChallengeRating,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_challenge_rating");

    expect(area.objects[0]?.creatureChallengeRating).toEqual(creatureChallengeRating);
    expect(area.objects[0]?.creatureChallengeRating).not.toBe(creatureChallengeRating);
  });

  it("maps exact Creature NaturalAC Byte storage without sharing the payload", async () => {
    const creatureNaturalArmorClass = {
      present: true as const,
      nativeType: "byte" as const,
      value: 2,
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureNaturalArmorClass,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_natural_ac");

    expect(area.objects[0]?.creatureNaturalArmorClass).toEqual(creatureNaturalArmorClass);
    expect(area.objects[0]?.creatureNaturalArmorClass).not.toBe(creatureNaturalArmorClass);
  });

  it("maps exact Creature saving-throw Short storage without sharing nested payloads", async () => {
    const creatureSavingThrowBonuses = {
      fortitude: { present: true as const, nativeType: "short" as const, value: 3 },
      reflex: { present: true as const, nativeType: "short" as const, value: 1 },
      will: { present: false as const },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureSavingThrowBonuses,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_saving_throws");

    expect(area.objects[0]?.creatureSavingThrowBonuses).toEqual(creatureSavingThrowBonuses);
    expect(area.objects[0]?.creatureSavingThrowBonuses).not.toBe(creatureSavingThrowBonuses);
    expect(area.objects[0]?.creatureSavingThrowBonuses?.fortitude)
      .not.toBe(creatureSavingThrowBonuses.fortitude);
  });

  it("maps exact Creature alignment Byte storage without sharing nested payloads", async () => {
    const creatureAlignment = {
      goodEvil: { present: true as const, nativeType: "byte" as const, value: 50 as const },
      lawfulChaotic: { present: true as const, nativeType: "byte" as const, value: 100 as const },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureAlignment,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_alignment");

    expect(area.objects[0]?.creatureAlignment).toEqual(creatureAlignment);
    expect(area.objects[0]?.creatureAlignment).not.toBe(creatureAlignment);
    expect(area.objects[0]?.creatureAlignment?.goodEvil).not.toBe(creatureAlignment.goodEvil);
  });

  it("maps exact Creature base ability-score Byte storage without sharing nested payloads", async () => {
    const creatureAbilityScores = {
      strength: { present: true as const, nativeType: "byte" as const, value: 15 },
      dexterity: { present: true as const, nativeType: "byte" as const, value: 12 },
      constitution: { present: false as const },
      intelligence: { present: true as const, nativeType: "byte" as const, value: 10 },
      wisdom: { present: true as const, nativeType: "byte" as const, value: 11 },
      charisma: { present: true as const, nativeType: "byte" as const, value: 8 },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureAbilityScores,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_ability_scores");

    expect(area.objects[0]?.creatureAbilityScores).toEqual(creatureAbilityScores);
    expect(area.objects[0]?.creatureAbilityScores).not.toBe(creatureAbilityScores);
    expect(area.objects[0]?.creatureAbilityScores?.strength)
      .not.toBe(creatureAbilityScores.strength);
  });

  it("maps exact Creature appearance-color Byte storage without sharing nested payloads", async () => {
    const creatureAppearanceColors = {
      skin: { present: true as const, nativeType: "byte" as const, value: 11 },
      hair: { present: true as const, nativeType: "byte" as const, value: 22 },
      tattoo1: { present: false as const },
      tattoo2: { present: true as const, nativeType: "byte" as const, value: 44 },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureAppearanceColors,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_appearance_colors");

    expect(area.objects[0]?.creatureAppearanceColors).toEqual(creatureAppearanceColors);
    expect(area.objects[0]?.creatureAppearanceColors).not.toBe(creatureAppearanceColors);
    expect(area.objects[0]?.creatureAppearanceColors?.skin)
      .not.toBe(creatureAppearanceColors.skin);
  });

  it("maps exact Creature body-part compatibility storage without sharing nested payloads", async () => {
    const keys = [
      "rightFoot", "leftFoot", "rightShin", "leftShin", "leftThigh", "rightThigh",
      "pelvis", "torso", "belt", "neck", "rightForearm", "leftForearm",
      "rightBicep", "leftBicep", "rightShoulder", "leftShoulder", "rightHand",
      "leftHand", "head",
    ];
    const creatureBodyParts = Object.fromEntries(
      keys.map((key) => [key, { present: false }]),
    ) as Record<string, any>;
    creatureBodyParts.torso = {
      present: true,
      value: 4096,
      legacyByte: { present: true, nativeType: "byte", value: 0 },
      wideWord: { present: true, nativeType: "word", value: 4096 },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureBodyParts,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_body_parts");

    expect(area.objects[0]?.creatureBodyParts).toEqual(creatureBodyParts);
    expect(area.objects[0]?.creatureBodyParts).not.toBe(creatureBodyParts);
    expect(area.objects[0]?.creatureBodyParts?.torso).not.toBe(creatureBodyParts.torso);
    expect(area.objects[0]?.creatureBodyParts?.torso.present &&
      area.objects[0].creatureBodyParts.torso.wideWord).not.toBe(
        creatureBodyParts.torso.wideWord,
      );
  });

  it("maps exact catalog-bound Creature appendages without sharing nested payloads", async () => {
    const creatureAppendages = {
      wings: {
        present: true as const,
        value: 3,
        modernDword: {
          present: true as const,
          nativeType: "dword" as const,
          value: 3,
          table: {
            resourceName: "wingmodel.2da" as const,
            sourceObjectKey: "runtime-source/module/wingmodel.2da",
            sourceLayer: "module" as const,
            sha256: "a".repeat(64),
            sizeBytes: 256,
            rowCount: 8,
            rowIndex: 3,
          },
        },
        legacyByte: { present: true as const, nativeType: "byte" as const, value: 1 },
      },
      tail: {
        present: true as const,
        value: 2,
        modernDword: {
          present: true as const,
          nativeType: "dword" as const,
          value: 2,
          table: {
            resourceName: "tailmodel.2da" as const,
            sourceObjectKey: "runtime-source/hak/tailmodel.2da",
            sourceLayer: "hak" as const,
            sha256: "b".repeat(64),
            sizeBytes: 192,
            rowCount: 6,
            rowIndex: 2,
          },
        },
        legacyByte: { present: false as const },
      },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureAppendages,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_appendages");

    expect(area.objects[0]?.creatureAppendages).toEqual(creatureAppendages);
    expect(area.objects[0]?.creatureAppendages).not.toBe(creatureAppendages);
    expect(area.objects[0]?.creatureAppendages?.wings).not.toBe(creatureAppendages.wings);
    expect(area.objects[0]?.creatureAppendages?.wings.present &&
      area.objects[0].creatureAppendages.wings.modernDword.present &&
      area.objects[0].creatureAppendages.wings.modernDword.table).not.toBe(
        creatureAppendages.wings.modernDword.table,
      );
  });

  it("rejects a Creature appendage bound to the wrong effective table", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureAppendages: {
          wings: {
            present: true,
            value: 2,
            modernDword: {
              present: true,
              nativeType: "dword",
              value: 2,
              table: {
                resourceName: "tailmodel.2da",
                sourceObjectKey: "runtime-source/module/tailmodel.2da",
                sourceLayer: "module",
                sha256: "b".repeat(64),
                sizeBytes: 192,
                rowCount: 6,
                rowIndex: 2,
              },
            },
            legacyByte: { present: false },
          },
          tail: { present: false },
        },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_appendages"))
      .rejects.toThrow();
  });

  it("rejects noncanonical Creature body-part compatibility storage at the HTTP boundary", async () => {
    const keys = [
      "rightFoot", "leftFoot", "rightShin", "leftShin", "leftThigh", "rightThigh",
      "pelvis", "torso", "belt", "neck", "rightForearm", "leftForearm",
      "rightBicep", "leftBicep", "rightShoulder", "leftShoulder", "rightHand",
      "leftHand", "head",
    ];
    const creatureBodyParts = Object.fromEntries(
      keys.map((key) => [key, { present: false }]),
    ) as Record<string, any>;
    creatureBodyParts.torso = {
      present: true,
      value: 4096,
      legacyByte: { present: true, nativeType: "byte", value: 1 },
      wideWord: { present: true, nativeType: "word", value: 4096 },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureBodyParts,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_body_parts"))
      .rejects.toThrow();
  });

  it("maps the exact coupled Creature HP state without sharing nested payloads", async () => {
    const creatureHitPointState = {
      present: true as const,
      hitPoints: { nativeType: "short" as const, value: 20 },
      currentHitPoints: { nativeType: "short" as const, value: 77 },
      maxHitPoints: { nativeType: "short" as const, value: 88 },
      constitution: { nativeType: "byte" as const, value: 4 },
      race: { nativeType: "byte" as const, value: 1 },
      classLevels: [3, 2],
      featRow40Present: false,
      racialTypes: {
        resourceName: "racialtypes.2da" as const,
        sourceObjectKey: "runtime-source/module/racialtypes.2da",
        sourceLayer: "module" as const,
        sha256: "a".repeat(64),
        sizeBytes: 400,
        rowCount: 3,
        rowIndex: 1,
        constitutionAdjust: 0,
      },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureHitPointState,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_hit_points");
    const mapped = area.objects[0]?.creatureHitPointState;

    expect(mapped).toEqual(creatureHitPointState);
    expect(mapped).not.toBe(creatureHitPointState);
    if (mapped?.present) {
      expect(mapped.hitPoints).not.toBe(creatureHitPointState.hitPoints);
      expect(mapped.classLevels).not.toBe(creatureHitPointState.classLevels);
      expect(mapped.racialTypes).not.toBe(creatureHitPointState.racialTypes);
    }
  });

  it("maps exact Creature ClassLevel provenance without sharing entry arrays", async () => {
    const creatureClassLevelState = {
      present: true as const,
      nativeType: "list" as const,
      structTypeId: 2 as const,
      classNativeType: "int" as const,
      levelNativeType: "short" as const,
      entries: [
        { classId: 4, level: 3, opaqueSiblingFieldCount: 2 },
        { classId: 7, level: 2, opaqueSiblingFieldCount: 1 },
      ],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_chicken",
        kind: "creature",
        templateId: "nw_chicken",
        creatureClassLevelState,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_class_levels");
    const mapped = area.objects[0]?.creatureClassLevelState;

    expect(mapped).toEqual(creatureClassLevelState);
    expect(mapped).not.toBe(creatureClassLevelState);
    expect(mapped?.present && mapped.entries).not.toBe(creatureClassLevelState.entries);
  });

  it("rejects a Creature HP binding whose Race and physical row differ", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:bad_hp",
        kind: "creature",
        templateId: "bad_hp",
        creatureHitPointState: {
          present: true,
          hitPoints: { nativeType: "short", value: 20 },
          currentHitPoints: { nativeType: "short", value: 20 },
          maxHitPoints: { nativeType: "short", value: 30 },
          constitution: { nativeType: "byte", value: 14 },
          race: { nativeType: "byte", value: 2 },
          classLevels: [5],
          featRow40Present: false,
          racialTypes: {
            resourceName: "racialtypes.2da",
            sourceObjectKey: "runtime-source/module/racialtypes.2da",
            sourceLayer: "module",
            sha256: "a".repeat(64),
            sizeBytes: 400,
            rowCount: 3,
            rowIndex: 1,
            constitutionAdjust: 0,
          },
        },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_bad_hit_points"))
      .rejects.toThrow();
  });

  it("maps exact Creature FactionID Word storage without sharing the payload", async () => {
    const creatureFaction = {
      present: true as const,
      nativeType: "word" as const,
      value: 1,
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_guard",
        kind: "creature",
        templateId: "nw_guard",
        creatureFaction,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_faction");

    expect(area.objects[0]?.creatureFaction).toEqual(creatureFaction);
    expect(area.objects[0]?.creatureFaction).not.toBe(creatureFaction);
  });

  it.each([
    { present: true, nativeType: "dword", value: 1 },
    { present: true, nativeType: "word", value: 65_536 },
    { present: true, nativeType: "word", value: 1, extra: true },
    { present: false, value: 1 },
  ])("rejects malformed Creature FactionID storage at the HTTP boundary %#", async (
    creatureFaction,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_faction",
        kind: "creature",
        templateId: "nw_guard",
        creatureFaction,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.getAreaById("token", "area_creature_faction_invalid"))
      .rejects.toThrow();
  });

  it("maps exact Creature TemplateResRef storage without sharing the payload", async () => {
    const creatureTemplateResRef = {
      present: true as const,
      nativeType: "resref" as const,
      value: "nw_guard",
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_guard",
        kind: "creature",
        templateId: "renderer_identity",
        creatureTemplateResRef,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_template_resref");

    expect(area.objects[0]?.creatureTemplateResRef).toEqual(creatureTemplateResRef);
    expect(area.objects[0]?.creatureTemplateResRef).not.toBe(creatureTemplateResRef);
  });

  it.each([
    { present: true, nativeType: "cexostring", value: "nw_guard" },
    { present: true, nativeType: "resref", value: "NW_GUARD" },
    { present: true, nativeType: "resref", value: "bad-resref" },
    { present: true, nativeType: "resref", value: "nw_guard", extra: true },
    { present: false, value: "nw_guard" },
  ])("rejects malformed Creature TemplateResRef storage at the HTTP boundary %#", async (
    creatureTemplateResRef,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_template_resref",
        kind: "creature",
        templateId: "nw_guard",
        creatureTemplateResRef,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.getAreaById("token", "area_creature_template_resref_invalid"))
      .rejects.toThrow();
  });

  it("maps exact Creature Subrace/Deity storage without sharing nested payloads", async () => {
    const creatureSpecialIdentityStrings = {
      subrace: { present: true as const, nativeType: "cexostring" as const, value: "Moon Elf" },
      deity: { present: false as const },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_guard",
        kind: "creature",
        templateId: "nw_guard",
        creatureSpecialIdentityStrings,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_subrace_deity");

    expect(area.objects[0]?.creatureSpecialIdentityStrings).toEqual(creatureSpecialIdentityStrings);
    expect(area.objects[0]?.creatureSpecialIdentityStrings).not.toBe(creatureSpecialIdentityStrings);
    expect(area.objects[0]?.creatureSpecialIdentityStrings?.subrace)
      .not.toBe(creatureSpecialIdentityStrings.subrace);
  });

  it.each([
    { subrace: { present: true, nativeType: "cexolocstring", value: "Moon Elf" }, deity: { present: false } },
    { subrace: { present: true, nativeType: "cexostring", value: "Moon\nElf" }, deity: { present: false } },
    { subrace: { present: false }, deity: { present: false }, extra: true },
    { subrace: { present: false } },
  ])("rejects malformed Creature Subrace/Deity storage at the HTTP boundary %#", async (
    creatureSpecialIdentityStrings,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_special_identity",
        kind: "creature",
        templateId: "nw_guard",
        creatureSpecialIdentityStrings,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.getAreaById("token", "area_creature_subrace_deity_invalid"))
      .rejects.toThrow();
  });

  it("maps exact Creature script ResRef storage without sharing nested payloads", async () => {
    const creatureScriptResRefs = {
      onHeartbeat: { present: true as const, nativeType: "resref" as const, value: "NW_C2_DEFAULT1" },
      onPerception: { present: false as const },
      onSpellCastAt: { present: false as const },
      onPhysicalAttacked: { present: false as const },
      onDamaged: { present: false as const },
      onDisturbed: { present: false as const },
      onCombatRoundEnd: { present: false as const },
      onConversation: { present: false as const },
      onSpawn: { present: true as const, nativeType: "resref" as const, value: "" },
      onRested: { present: false as const },
      onDeath: { present: false as const },
      onUserDefined: { present: false as const },
      onBlocked: { present: false as const },
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:nw_guard",
        kind: "creature",
        templateId: "nw_guard",
        creatureScriptResRefs,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_creature_script_resrefs");

    expect(area.objects[0]?.creatureScriptResRefs).toEqual(creatureScriptResRefs);
    expect(area.objects[0]?.creatureScriptResRefs).not.toBe(creatureScriptResRefs);
    expect(area.objects[0]?.creatureScriptResRefs?.onHeartbeat)
      .not.toBe(creatureScriptResRefs.onHeartbeat);
  });

  it.each([
    ["wrong native type", {
      onHeartbeat: { present: true, nativeType: "cexostring", value: "main" },
    }],
    ["malformed value", {
      onHeartbeat: { present: true, nativeType: "resref", value: "bad-resref" },
    }],
    ["unknown member", { extra: true }],
    ["missing member", { onBlocked: undefined }],
  ] as const)("rejects Creature script ResRef storage with %s", async (_label, patch) => {
    const creatureScriptResRefs: Record<string, unknown> = {
      onHeartbeat: { present: false },
      onPerception: { present: false },
      onSpellCastAt: { present: false },
      onPhysicalAttacked: { present: false },
      onDamaged: { present: false },
      onDisturbed: { present: false },
      onCombatRoundEnd: { present: false },
      onConversation: { present: false },
      onSpawn: { present: false },
      onRested: { present: false },
      onDeath: { present: false },
      onUserDefined: { present: false },
      onBlocked: { present: false },
      ...patch,
    };
    if ("onBlocked" in patch && patch.onBlocked === undefined) {
      delete creatureScriptResRefs.onBlocked;
    }
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_script_resrefs",
        kind: "creature",
        templateId: "nw_guard",
        creatureScriptResRefs,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.getAreaById("token", "area_creature_script_resrefs_invalid"))
      .rejects.toThrow();
  });

  it.each([
    { present: false, value: "" },
    { present: true },
    { present: true, value: "bad-dialog" },
    { present: true, value: "a2345678901234567" },
    { present: true, value: "guard_dialog", extra: true },
  ])("rejects malformed Creature Conversation provenance at the HTTP boundary %#", async (
    creatureConversation,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_conversation",
        kind: "creature",
        templateId: "nw_chicken",
        creatureConversation,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_conversation")).rejects.toThrow();
  });

  it.each([
    { present: false, value: 1 },
    { present: true },
    { present: true, value: 2 },
    { present: true, value: false },
    { present: true, value: 1, extra: true },
  ])("rejects malformed Creature Interruptable provenance at the HTTP boundary %#", async (
    creatureInterruptable,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_interruptable",
        kind: "creature",
        templateId: "nw_chicken",
        creatureInterruptable,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_interruptable")).rejects.toThrow();
  });

  it.each([
    {
      disarmable: { present: true, value: 1 },
      plot: { present: true, value: 0 },
      immortal: { present: false },
      lootable: { present: true, value: 1 },
    },
    {
      disarmable: { present: true, value: 1 },
      plot: { present: true, value: 0, extra: true },
      immortal: { present: false },
      lootable: { present: true, value: 1 },
      noPermanentDeath: { present: true, value: 0 },
    },
    {
      disarmable: { present: true, value: 1 },
      plot: { present: true, value: 2 },
      immortal: { present: false },
      lootable: { present: true, value: 1 },
      noPermanentDeath: { present: true, value: 0 },
    },
    {
      disarmable: { present: true, value: 1 },
      plot: { present: true, value: 0 },
      immortal: { present: false },
      lootable: { present: true, value: 1 },
      noPermanentDeath: { present: true, value: 0 },
      extra: { present: false },
    },
  ])("rejects malformed Creature advanced flag provenance at the HTTP boundary %#", async (
    creatureAdvancedFlags,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_advanced_flags",
        kind: "creature",
        templateId: "nw_chicken",
        creatureAdvancedFlags,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_advanced_flags")).rejects.toThrow();
  });

  it.each([
    [{ present: false, value: 0 }, { present: false }],
    [{ present: true, nativeType: "word", value: 2 }, { present: false }],
    [{ present: true, nativeType: "byte", value: 256 }, { present: false }],
    [{ present: false }, { present: false, valueMilliseconds: 0 }],
    [{ present: false }, { present: true, nativeType: "word", valueMilliseconds: 12_000 }],
    [{ present: false }, { present: true, nativeType: "dword", valueMilliseconds: -1 }],
    [{ present: false }, {
      present: true,
      nativeType: "dword",
      valueMilliseconds: 12_000,
      extra: true,
    }],
  ])("rejects malformed Creature death-remains storage at the HTTP boundary %#", async (
    creatureBodyBag,
    creatureDecayTime,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_death_remains",
        kind: "creature",
        templateId: "nw_chicken",
        creatureBodyBag,
        creatureDecayTime,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_death_remains")).rejects.toThrow();
  });

  it.each([
    (value: any) => { value.extra = true; },
    (value: any) => { value.firstName.extra = true; },
    (value: any) => { value.lastName.entries[0].textBytesBase64 = "QR=="; },
    (value: any) => { value.lastName.entries = Array.from(
      { length: 65 },
      () => ({ languageId: 0, textBytesBase64: "" }),
    ); },
  ])("rejects malformed Creature name provenance at the HTTP boundary %#", async (mutate) => {
    const creatureLocalizedStrings: any = {
      firstName: { present: false },
      lastName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R3VhcmQ=" }],
      },
    };
    mutate(creatureLocalizedStrings);
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "creature:0:invalid_names",
        kind: "creature",
        templateId: "nw_chicken",
        creatureLocalizedStrings,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_names")).rejects.toThrow();
  });

  it("maps exact Placeable TrapType storage and effective traps.2da catalog", async () => {
    const trapCatalog = {
      descriptor: {
        resourceName: "traps.2da",
        sourceObjectKey: "modules/current/traps.2da",
        sourceLayer: "module",
        sha256: "d".repeat(64),
        sizeBytes: 2048,
        rowCount: 1,
      },
      rows: [{
        rowIndex: 0,
        setDc: 10,
        detectDcMod: 0,
        disarmDcMod: 3,
        displayName: "Minor",
        displaySource: "label",
      }],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_trap_type",
        name: "Trap Type",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
        composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
        updatedAt: "2026-08-19T00:00:00.000Z",
        placeableTrapTypeCatalog: trapCatalog,
        objects: [{
          objectId: "plc:0:trap",
          kind: "placeable",
          templateId: "plc_chest",
          placeableTrapType: { present: true, nativeType: "byte", value: 0 },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_trap_type");
    expect(area.placeableTrapTypeCatalog).toEqual(trapCatalog);
    expect(area.objects[0]?.placeableTrapType).toEqual({ present: true, nativeType: "byte", value: 0 });
  });

  it("maps exact Placeable BodyBag storage and effective bodybag.2da catalog", async () => {
    const bodyBagCatalog = {
      descriptor: {
        resourceName: "bodybag.2da",
        sourceObjectKey: "modules/current/bodybag.2da",
        sourceLayer: "module",
        sha256: "e".repeat(64),
        sizeBytes: 502,
        rowCount: 1,
      },
      rows: [{
        rowIndex: 0,
        label: "default",
        nameStrRef: 6671,
        displayName: "Default",
        displaySource: "strref",
      }],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_body_bag",
        name: "Body Bag",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
        composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
        updatedAt: "2026-08-19T00:00:00.000Z",
        placeableBodyBagCatalog: bodyBagCatalog,
        objects: [{
          objectId: "plc:0:bag",
          kind: "placeable",
          templateId: "plc_chest",
          placeableBodyBag: { present: true, nativeType: "byte", value: 0 },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_body_bag");
    expect(area.placeableBodyBagCatalog).toEqual(bodyBagCatalog);
    expect(area.objects[0]?.placeableBodyBag).toEqual({ present: true, nativeType: "byte", value: 0 });
  });

  it("maps exact canonical Placeable PortraitId storage and sparse portraits.2da catalog", async () => {
    const portraitCatalog = {
      descriptor: {
        resourceName: "portraits.2da",
        sourceObjectKey: "modules/current/portraits.2da",
        sourceLayer: "module",
        sha256: "a".repeat(64),
        sizeBytes: 4096,
        rowCount: 700,
      },
      rows: [
        { rowIndex: 462, baseResRef: "po_hu_m_01_" },
        { rowIndex: 463, baseResRef: "po_hu_m_02_" },
      ],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_portrait",
        name: "Portrait",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
        composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
        updatedAt: "2026-08-19T00:00:00.000Z",
        placeablePortraitCatalog: portraitCatalog,
        objects: [{
          objectId: "plc:0:portrait",
          kind: "placeable",
          templateId: "plc_chest",
          placeablePortraitId: { present: true, nativeType: "word", value: 462 },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_portrait");
    expect(area.placeablePortraitCatalog).toEqual(portraitCatalog);
    expect(area.objects[0]?.placeablePortraitId)
      .toEqual({ present: true, nativeType: "word", value: 462 });
  });

  it("maps exact Placeable Faction DWord storage and module repute.fac catalog", async () => {
    const factionCatalog = {
      descriptor: {
        resourceName: "repute.fac",
        sourceObjectKey: "modules/current/repute.fac",
        sha256: "b".repeat(64),
        sizeBytes: 1889,
        factionCount: 3,
      },
      rows: [
        { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
      ],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_faction",
        name: "Faction",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
        composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
        updatedAt: "2026-08-19T00:00:00.000Z",
        placeableFactionCatalog: factionCatalog,
        objects: [{
          objectId: "plc:0:faction",
          kind: "placeable",
          templateId: "plc_chest",
          placeableFaction: { present: true, nativeType: "dword", value: 1 },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_faction");
    expect(area.placeableFactionCatalog).toEqual(factionCatalog);
    expect(area.objects[0]?.placeableFaction)
      .toEqual({ present: true, nativeType: "dword", value: 1 });
  });

  it("maps an exact Placeable VarTable provenance payload without normalization", async () => {
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int", value: -2 },
      { sourceIndex: 1, name: "Scale", type: "float", value: 1.5 },
      { sourceIndex: 2, name: "", type: "string", value: "" },
    ];
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_variables",
      name: "Variables",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-19T00:00:00.000Z",
      objects: [{
        objectId: "plc:0:variables",
        kind: "placeable",
        templateId: "plc_chest",
        placeableVariables: { expectedEntries },
        x: 0, y: 0, z: 0, bearing: 0,
      }],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_variables");
    expect(area.objects[0]?.placeableVariables).toEqual({ expectedEntries });
    expect(area.objects[0]?.placeableVariables?.expectedEntries).not.toBe(expectedEntries);
  });

  it("maps an exact Creature VarTable provenance payload without normalization", async () => {
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int", value: -2 },
      { sourceIndex: 1, name: "Scale", type: "float", value: 1.5 },
      { sourceIndex: 2, name: "", type: "string", value: "" },
    ];
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_creature_variables",
      name: "Creature Variables",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 1, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-28T00:00:00.000Z",
      objects: [{
        objectId: "cre:0:variables",
        kind: "creature",
        templateId: "nw_guard",
        creatureVariables: { expectedEntries },
        x: 0, y: 0, z: 0, bearing: 0,
      }],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_variables");
    expect(area.objects[0]?.creatureVariables).toEqual({ expectedEntries });
    expect(area.objects[0]?.creatureVariables?.expectedEntries).not.toBe(expectedEntries);
  });

  it("rejects malformed Creature VarTable provenance at the HTTP boundary", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_creature_variables_bad",
      name: "Creature Variables Bad",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 1, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-28T00:00:00.000Z",
      objects: [{
        objectId: "cre:0:variables",
        kind: "creature",
        templateId: "nw_guard",
        creatureVariables: { expectedEntries: [
          { sourceIndex: 1, name: "Counter", type: "int", value: 1 },
        ] },
        x: 0, y: 0, z: 0, bearing: 0,
      }],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_variables_bad"))
      .rejects.toThrow();
  });

  it("maps one exact Creature GIC editor comment without normalization", async () => {
    const editorComment = "Aurora line one\r\nAurora line two";
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "cre:0:comment",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_guard",
        creatureMetadata: { editorComment },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_creature_comment");

    expect(area.objects[0]?.creatureMetadata?.editorComment).toBe(editorComment);
  });

  it("maps one exact ground-item GIC editor comment without normalization", async () => {
    const editorComment = "  Aurora item line one\r\nline two  ";
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:comment",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemMetadata: { editorComment },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_comment");
    expect(area.objects[0]?.itemMetadata?.editorComment).toBe(editorComment);
  });

  it("maps one exact Store GIC editor comment without normalization", async () => {
    const editorComment = "  Aurora Store line one\r\nline two  ";
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:comment",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        storeMetadata: { editorComment },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_store_comment");

    expect(area.objects[0]?.storeMetadata?.editorComment).toBe(editorComment);
  });

  it("maps and detaches one exact complete Store commerce vector", async () => {
    const commerce = {
      markUp: 100,
      markDown: 65,
      blackMarket: false,
      blackMarketMarkDown: 25,
      identifyPrice: 100,
      maxBuyPrice: -1,
      storeGold: -1,
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:commerce",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        storeMetadata: { commerce },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_store_commerce");

    expect(area.objects[0]?.storeMetadata?.commerce).toStrictEqual(commerce);
    expect(area.objects[0]?.storeMetadata?.commerce).not.toBe(commerce);
  });

  it("maps and detaches one exact complete Store script-ResRef pair", async () => {
    const scriptResRefs = {
      onOpenStore: "store_open",
      onStoreClosed: "store_closed",
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:scripts",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        storeMetadata: { scriptResRefs },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_store_scripts");

    expect(area.objects[0]?.storeMetadata?.scriptResRefs).toStrictEqual(scriptResRefs);
    expect(area.objects[0]?.storeMetadata?.scriptResRefs).not.toBe(scriptResRefs);
  });

  it("maps one exact ordered retained Store VarTable provenance", async () => {
    const variables = {
      expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: -4 },
        { sourceIndex: 1, name: "Scale", type: "float", value: Math.fround(2.5) },
        { sourceIndex: 2, name: "Label", type: "string", value: "ready" },
      ],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:variables",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        storeMetadata: { variables },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_store_variables");

    expect(area.objects[0]?.storeMetadata?.variables).toStrictEqual(variables);
    expect(area.objects[0]?.storeMetadata?.variables?.expectedEntries[0])
      .not.toBe(variables.expectedEntries[0]);
  });

  it("maps and detaches exact catalog-bound Store restriction provenance", async () => {
    const restrictions = {
      expectedValue: {
        willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
        willOnlyBuy: { present: false, baseItemIds: [] },
      },
      tableSha256: "e".repeat(64),
      tableRowCount: 4,
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:restrictions",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        storeMetadata: { restrictions },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_store_restrictions");

    expect(area.objects[0]?.storeMetadata?.restrictions).toStrictEqual(restrictions);
    expect(area.objects[0]?.storeMetadata?.restrictions).not.toBe(restrictions);
    expect(area.objects[0]?.storeMetadata?.restrictions?.expectedValue.willNotBuy.baseItemIds)
      .not.toBe(restrictions.expectedValue.willNotBuy.baseItemIds);
  });

  it.each([
    ["non-Store owner", "placeable", {
      expectedValue: {
        willNotBuy: { present: false, baseItemIds: [] },
        willOnlyBuy: { present: false, baseItemIds: [] },
      },
      tableSha256: "e".repeat(64),
      tableRowCount: 4,
    }],
    ["out-of-catalog source row", "store", {
      expectedValue: {
        willNotBuy: { present: true, baseItemIds: [4] },
        willOnlyBuy: { present: false, baseItemIds: [] },
      },
      tableSha256: "e".repeat(64),
      tableRowCount: 4,
    }],
  ])("rejects Store restriction provenance with %s", async (
    _label,
    kind,
    restrictions,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:restrictions_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_merc_dye",
        storeMetadata: { restrictions },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_store_restrictions_bad"))
      .rejects.toThrow();
  });

  it("maps and detaches exact catalog-bound retained Store inventory provenance", async () => {
    const inventory = {
      expectedBuckets: [
        {
          bucketTypeId: 0,
          entries: [{
            sourceIndex: 0,
            resRef: "itm_a",
            baseItemId: 0,
            slotWidth: 1,
            slotHeight: 1,
            x: 0,
            y: 0,
            infinite: true,
          }],
        },
        { bucketTypeId: 4, entries: [] },
        { bucketTypeId: 2, entries: [] },
        { bucketTypeId: 3, entries: [] },
        { bucketTypeId: 1, entries: [] },
      ],
      tableSha256: "e".repeat(64),
      tableRowCount: 1,
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:inventory",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        storeMetadata: { inventory },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_store_inventory");

    expect(area.objects[0]?.storeMetadata?.inventory).toStrictEqual(inventory);
    expect(area.objects[0]?.storeMetadata?.inventory).not.toBe(inventory);
    expect(area.objects[0]?.storeMetadata?.inventory?.expectedBuckets[0]?.entries[0])
      .not.toBe(inventory.expectedBuckets[0]?.entries[0]);
  });

  it("rejects noncanonical retained Store inventory bucket order", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:inventory_bad",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        storeMetadata: {
          inventory: {
            expectedBuckets: [
              { bucketTypeId: 4, entries: [] },
              { bucketTypeId: 0, entries: [] },
              { bucketTypeId: 2, entries: [] },
              { bucketTypeId: 3, entries: [] },
              { bucketTypeId: 1, entries: [] },
            ],
            tableSha256: "e".repeat(64),
            tableRowCount: 1,
          },
        },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_store_inventory_bad"))
      .rejects.toThrow();
  });

  it.each([
    [{ present: false }],
    [{ present: true, value: "" }],
    [{ present: true, value: "  WEST_WALL_LOOT  " }],
  ] as const)("maps exact ground-item Tag storage without normalization %#", async (itemTag) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:tag",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemTag,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_tag");

    expect(area.objects[0]?.itemTag).toStrictEqual(itemTag);
  });

  it.each([
    ["non-Item owner", "placeable", { present: true, value: "VALID" }],
    ["missing value", "item", { present: true }],
    ["unexpected value on absence", "item", { present: false, value: "INVENTED" }],
    ["over-budget value", "item", { present: true, value: "x".repeat(33) }],
    ["NUL-bearing value", "item", { present: true, value: "bad\0tag" }],
  ])("rejects ground-item Tag storage with %s", async (_label, kind, itemTag) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:tag_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemTag,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_tag_bad")).rejects.toThrow();
  });

  it.each([
    [{ present: false }],
    [{ present: true, value: "" }],
    [{ present: true, value: "  AREA_EXIT  " }],
  ] as const)("maps exact Trigger Tag storage without normalization %#", async (triggerTag) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "trigger:0:tag",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        triggerTag,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_trigger_tag");

    expect(area.objects[0]?.triggerTag).toStrictEqual(triggerTag);
  });

  it.each([
    ["non-Trigger owner", "encounter", { present: true, value: "VALID" }],
    ["missing value", "trigger", { present: true }],
    ["unexpected value on absence", "trigger", { present: false, value: "INVENTED" }],
    ["over-budget value", "trigger", { present: true, value: "x".repeat(33) }],
    ["NUL-bearing value", "trigger", { present: true, value: "bad\0tag" }],
  ])("rejects Trigger Tag storage with %s", async (_label, kind, triggerTag) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "trigger:0:tag_bad",
        sourceIndex: 0,
        kind,
        templateId: "newgeneric",
        triggerTag,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_trigger_tag_bad")).rejects.toThrow();
  });

  it.each([
    [{ present: false }],
    [{ present: true, value: "" }],
    [{ present: true, value: "  PATROL_POINT_01  " }],
  ] as const)("maps exact Waypoint Tag storage without normalization %#", async (waypointTag) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:tag",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointTag,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_waypoint_tag");

    expect(area.objects[0]?.waypointTag).toStrictEqual(waypointTag);
  });

  it.each([
    ["non-Waypoint owner", "trigger", { present: true, value: "VALID" }],
    ["missing value", "waypoint", { present: true }],
    ["unexpected value on absence", "waypoint", { present: false, value: "INVENTED" }],
    ["over-budget value", "waypoint", { present: true, value: "x".repeat(33) }],
    ["NUL-bearing value", "waypoint", { present: true, value: "bad\0tag" }],
  ])("rejects Waypoint Tag storage with %s", async (_label, kind, waypointTag) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:tag_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_waypoint001",
        waypointTag,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_waypoint_tag_bad")).rejects.toThrow();
  });

  it.each([
    [{ present: false }],
    [{ present: true, nativeType: "resref", value: "nw_waypoint001" }],
  ] as const)(
    "maps exact Waypoint TemplateResRef storage without normalization %#",
    async (waypointTemplateResRef) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "waypoint:0:template_resref",
          sourceIndex: 0,
          kind: "waypoint",
          templateId: "renderer_identity",
          waypointTemplateResRef,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_waypoint_template_resref");

      expect(area.objects[0]?.waypointTemplateResRef)
        .toStrictEqual(waypointTemplateResRef);
      expect(area.objects[0]?.waypointTemplateResRef)
        .not.toBe(waypointTemplateResRef);
    },
  );

  it.each([
    [{ present: false }],
    [{ present: true, nativeType: "resref", value: "newgeneric" }],
  ] as const)(
    "maps exact Trigger TemplateResRef storage without normalization %#",
    async (triggerTemplateResRef) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "trigger:0:template_resref",
          sourceIndex: 0,
          kind: "trigger",
          templateId: "renderer_identity",
          triggerTemplateResRef,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_trigger_template_resref");

      expect(area.objects[0]?.triggerTemplateResRef)
        .toStrictEqual(triggerTemplateResRef);
      expect(area.objects[0]?.triggerTemplateResRef)
        .not.toBe(triggerTemplateResRef);
    },
  );

  it.each([
    [{ present: false }],
    [{ present: true, nativeType: "resref", value: "x2_gnoll001" }],
  ] as const)(
    "maps exact Encounter TemplateResRef storage without normalization %#",
    async (encounterTemplateResRef) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "encounter:0:template_resref",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "renderer_identity",
          encounterTemplateResRef,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_encounter_template_resref");

      expect(area.objects[0]?.encounterTemplateResRef)
        .toStrictEqual(encounterTemplateResRef);
      expect(area.objects[0]?.encounterTemplateResRef)
        .not.toBe(encounterTemplateResRef);
    },
  );

  it.each([
    ["non-Encounter owner", "trigger", {
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    }],
    ["missing value", "encounter", { present: true, nativeType: "resref" }],
    ["unexpected value on absence", "encounter", {
      present: false,
      value: "x2_gnoll001",
    }],
    ["wrong native type", "encounter", {
      present: true,
      nativeType: "cexostring",
      value: "x2_gnoll001",
    }],
    ["uppercase value", "encounter", {
      present: true,
      nativeType: "resref",
      value: "X2_GNOLL001",
    }],
  ])(
    "rejects Encounter TemplateResRef storage with %s",
    async (_label, kind, encounterTemplateResRef) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "encounter:0:template_resref_bad",
          sourceIndex: 0,
          kind,
          templateId: "renderer_identity",
          encounterTemplateResRef,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      await expect(port.getAreaById("token", "area_encounter_template_resref_bad"))
        .rejects.toThrow();
    },
  );

  it.each([
    ["non-Waypoint owner", "trigger", {
      present: true,
      nativeType: "resref",
      value: "nw_waypoint001",
    }],
    ["missing value", "waypoint", { present: true, nativeType: "resref" }],
    ["unexpected value on absence", "waypoint", {
      present: false,
      value: "nw_waypoint001",
    }],
    ["wrong native type", "waypoint", {
      present: true,
      nativeType: "cexostring",
      value: "nw_waypoint001",
    }],
    ["uppercase value", "waypoint", {
      present: true,
      nativeType: "resref",
      value: "NW_WAYPOINT001",
    }],
  ])(
    "rejects Waypoint TemplateResRef storage with %s",
    async (_label, kind, waypointTemplateResRef) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "waypoint:0:template_resref_bad",
          sourceIndex: 0,
          kind,
          templateId: "renderer_identity",
          waypointTemplateResRef,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      await expect(port.getAreaById("token", "area_waypoint_template_resref_bad"))
        .rejects.toThrow();
    },
  );

  it("maps exact Waypoint LocalizedName storage as a detached value", async () => {
    const waypointLocalizedName = {
      present: true as const,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:name",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointLocalizedName,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_waypoint_name");

    expect(area.objects[0]?.waypointLocalizedName).toEqual(waypointLocalizedName);
    expect(area.objects[0]?.waypointLocalizedName).not.toBe(waypointLocalizedName);
  });

  it("maps exact Waypoint Description storage as a detached value", async () => {
    const waypointDescription = {
      present: true as const,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:description",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointDescription,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_waypoint_description");

    expect(area.objects[0]?.waypointDescription).toEqual(waypointDescription);
    expect(area.objects[0]?.waypointDescription).not.toBe(waypointDescription);
  });

  it("maps one exact Waypoint MapNote vector as a deeply detached value", async () => {
    const waypointMapNote = {
      hasMapNoteByte: 0 as const,
      mapNoteStorage: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
      },
      mapNoteEnabledByte: 1 as const,
    };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:map_note",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointMapNote,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_waypoint_map_note");

    expect(area.objects[0]?.waypointMapNote).toEqual(waypointMapNote);
    expect(area.objects[0]?.waypointMapNote).not.toBe(waypointMapNote);
    expect(area.objects[0]?.waypointMapNote?.mapNoteStorage)
      .not.toBe(waypointMapNote.mapNoteStorage);
  });

  it("maps one exact ordered Waypoint VarTable provenance as a deeply detached value", async () => {
    const waypointVariables = { expectedEntries: [
      { sourceIndex: 0, name: "dup", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "dup", type: "string" as const, value: "north" },
    ] };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:variables",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointVariables,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    const area = await port.getAreaById("token", "area_waypoint_variables");
    expect(area.objects[0]?.waypointVariables).toEqual(waypointVariables);
    expect(area.objects[0]?.waypointVariables).not.toBe(waypointVariables);
    expect(area.objects[0]?.waypointVariables?.expectedEntries)
      .not.toBe(waypointVariables.expectedEntries);
  });

  it("maps exact Waypoint paired-GIC editor Comment metadata as a detached value", async () => {
    const waypointMetadata = { editorComment: "  patrol\r\nroute  " };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:comment",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointMetadata,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_waypoint_comment");

    expect(area.objects[0]?.waypointMetadata).toEqual(waypointMetadata);
    expect(area.objects[0]?.waypointMetadata).not.toBe(waypointMetadata);
  });

  it.each([
    ["wrong owner", "trigger", "note"],
    ["NUL", "waypoint", "bad\0note"],
  ])("rejects Waypoint editor Comment metadata with %s", async (_label, kind, editorComment) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:comment_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_waypoint001",
        waypointMetadata: { editorComment },
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    await expect(port.getAreaById("token", "area_waypoint_comment_bad"))
      .rejects.toThrow();
  });

  it.each([
    ["non-Waypoint owner", "trigger", {
      present: true, strRef: 0xffff_ffff, entries: [],
    }],
    ["noncanonical text bytes", "waypoint", {
      present: true, strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "***" }],
    }],
  ])("rejects Waypoint Description storage with %s", async (
    _label,
    kind,
    waypointDescription,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:description_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_waypoint001",
        waypointDescription,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_waypoint_description_bad"))
      .rejects.toThrow();
  });

  it.each([
    ["non-Waypoint owner", "trigger", {
      hasMapNoteByte: 0,
      mapNoteStorage: { present: true, strRef: 0xffff_ffff, entries: [] },
      mapNoteEnabledByte: 1,
    }],
    ["partial vector", "waypoint", {
      hasMapNoteByte: 0,
      mapNoteEnabledByte: 1,
    }],
    ["non-binary byte", "waypoint", {
      hasMapNoteByte: 2,
      mapNoteStorage: { present: true, strRef: 0xffff_ffff, entries: [] },
      mapNoteEnabledByte: 1,
    }],
  ])("rejects Waypoint MapNote storage with %s", async (
    _label,
    kind,
    waypointMapNote,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:map_note_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_waypoint001",
        waypointMapNote,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_waypoint_map_note_bad"))
      .rejects.toThrow();
  });

  it.each([
    ["non-Waypoint owner", "trigger", {
      present: true, strRef: 0xffff_ffff, entries: [],
    }],
    ["noncanonical text bytes", "waypoint", {
      present: true, strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "***" }],
    }],
  ])("rejects Waypoint LocalizedName storage with %s", async (
    _label,
    kind,
    waypointLocalizedName,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "waypoint:0:name_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_waypoint001",
        waypointLocalizedName,
        x: 0, y: 0, z: 0, bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_waypoint_name_bad"))
      .rejects.toThrow();
  });

  it.each([
    [{ present: false }],
    [{ present: true, value: "" }],
    [{ present: true, value: "  GNOLL_AMBUSH  " }],
  ] as const)("maps exact Encounter Tag storage without normalization %#", async (encounterTag) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:tag",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "x2_gnoll001",
        encounterTag,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_encounter_tag");

    expect(area.objects[0]?.encounterTag).toStrictEqual(encounterTag);
  });

  it.each([
    ["non-Encounter owner", "trigger", { present: true, value: "VALID" }],
    ["missing value", "encounter", { present: true }],
    ["unexpected value on absence", "encounter", { present: false, value: "INVENTED" }],
    ["over-budget value", "encounter", { present: true, value: "x".repeat(33) }],
    ["NUL-bearing value", "encounter", { present: true, value: "bad\0tag" }],
  ])("rejects Encounter Tag storage with %s", async (_label, kind, encounterTag) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:tag_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterTag,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_tag_bad")).rejects.toThrow();
  });

  it.each([0, 1] as const)(
    "maps exact retained Encounter Active byte %i without coercion",
    async (activeByte) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "encounter:0:active",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "x2_gnoll001",
          encounterActive: { activeByte },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_encounter_active");

      expect(area.objects[0]?.encounterActive).toStrictEqual({ activeByte });
    },
  );

  it.each([
    ["non-Encounter owner", "trigger", { activeByte: 1 }],
    ["missing byte", "encounter", {}],
    ["noncanonical byte", "encounter", { activeByte: 2 }],
    ["boolean alias", "encounter", { activeByte: true }],
    ["unexpected key", "encounter", { activeByte: 1, extra: true }],
  ])("rejects Encounter Active storage with %s", async (_label, kind, encounterActive) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:active_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterActive,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_active_bad")).rejects.toThrow();
  });

  it.each([0, 1] as const)(
    "maps exact retained Encounter PlayerOnly byte %i without coercion",
    async (playerOnlyByte) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "encounter:0:player_only",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "x2_gnoll001",
          encounterPlayerOnly: { playerOnlyByte },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_encounter_player_only");

      expect(area.objects[0]?.encounterPlayerOnly).toStrictEqual({ playerOnlyByte });
    },
  );

  it.each([
    ["non-Encounter owner", "trigger", { playerOnlyByte: 1 }],
    ["missing byte", "encounter", {}],
    ["noncanonical byte", "encounter", { playerOnlyByte: 2 }],
    ["boolean alias", "encounter", { playerOnlyByte: true }],
    ["unexpected key", "encounter", { playerOnlyByte: 1, extra: true }],
  ])("rejects Encounter PlayerOnly storage with %s", async (
    _label,
    kind,
    encounterPlayerOnly,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:player_only_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterPlayerOnly,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(
      port.getAreaById("token", "area_encounter_player_only_bad"),
    ).rejects.toThrow();
  });

  it.each([0, 1] as const)(
    "maps exact retained Encounter Reset byte %i without coercion",
    async (resetByte) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "encounter:0:reset",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "x2_gnoll001",
          encounterReset: { resetByte },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_encounter_reset");

      expect(area.objects[0]?.encounterReset).toStrictEqual({ resetByte });
    },
  );

  it.each([
    ["non-Encounter owner", "trigger", { resetByte: 1 }],
    ["missing byte", "encounter", {}],
    ["noncanonical byte", "encounter", { resetByte: 2 }],
    ["boolean alias", "encounter", { resetByte: true }],
    ["unexpected key", "encounter", { resetByte: 1, extra: true }],
  ])("rejects Encounter Reset storage with %s", async (
    _label,
    kind,
    encounterReset,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:reset_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterReset,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_reset_bad"))
      .rejects.toThrow();
  });

  it.each([1, 60, 32_000] as const)(
    "maps exact retained Encounter ResetTime INT %i without coercion",
    async (resetTime) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "encounter:0:reset_time",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "x2_gnoll001",
          encounterResetTime: { resetTime },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_encounter_reset_time");

      expect(area.objects[0]?.encounterResetTime).toStrictEqual({ resetTime });
    },
  );

  it.each([
    ["non-Encounter owner", "trigger", { resetTime: 60 }],
    ["missing value", "encounter", {}],
    ["below minimum", "encounter", { resetTime: 0 }],
    ["above maximum", "encounter", { resetTime: 32_001 }],
    ["fraction", "encounter", { resetTime: 1.5 }],
    ["string alias", "encounter", { resetTime: "60" }],
    ["unexpected key", "encounter", { resetTime: 60, extra: true }],
  ])("rejects Encounter ResetTime storage with %s", async (
    _label,
    kind,
    encounterResetTime,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:reset_time_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterResetTime,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_reset_time_bad"))
      .rejects.toThrow();
  });

  it.each([0, 1] as const)(
    "maps exact retained Encounter SpawnOption INT %i without coercion",
    async (spawnOption) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "encounter:0:spawn_option",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "x2_gnoll001",
          encounterSpawnOption: { spawnOption },
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_encounter_spawn_option");

      expect(area.objects[0]?.encounterSpawnOption).toStrictEqual({ spawnOption });
    },
  );

  it.each([
    ["non-Encounter owner", "trigger", { spawnOption: 0 }],
    ["missing value", "encounter", {}],
    ["negative", "encounter", { spawnOption: -1 }],
    ["above maximum", "encounter", { spawnOption: 2 }],
    ["fraction", "encounter", { spawnOption: 0.5 }],
    ["string alias", "encounter", { spawnOption: "0" }],
    ["unexpected key", "encounter", { spawnOption: 0, extra: true }],
  ])("rejects Encounter SpawnOption storage with %s", async (
    _label,
    kind,
    encounterSpawnOption,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "encounter:0:spawn_option_bad",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterSpawnOption,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_spawn_option_bad"))
      .rejects.toThrow();
  });

  it.each([
    [{ present: false }],
    [{ present: true, nativeType: "resref", value: "nw_sword" }],
  ] as const)(
    "maps exact ground-item TemplateResRef storage without normalization %#",
    async (itemTemplateResRef) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "itm:0:template_resref",
          sourceIndex: 0,
          kind: "item",
          templateId: "nw_sword",
          itemTemplateResRef,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      const area = await port.getAreaById("token", "area_item_template_resref");

      expect(area.objects[0]?.itemTemplateResRef).toStrictEqual(itemTemplateResRef);
    },
  );

  it.each([
    [
      "non-Item owner",
      "placeable",
      { present: true, nativeType: "resref", value: "nw_sword" },
    ],
    ["missing value", "item", { present: true, nativeType: "resref" }],
    ["wrong native type", "item", {
      present: true,
      nativeType: "cexostring",
      value: "nw_sword",
    }],
    ["unexpected value on absence", "item", { present: false, value: "nw_sword" }],
    ["empty value", "item", { present: true, nativeType: "resref", value: "" }],
    ["uppercase value", "item", {
      present: true,
      nativeType: "resref",
      value: "NW_SWORD",
    }],
  ])(
    "rejects ground-item TemplateResRef storage with %s",
    async (_label, kind, itemTemplateResRef) => {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({
        data: areaDetailWithObject({
          objectId: "itm:0:template_resref_bad",
          sourceIndex: 0,
          kind,
          templateId: "nw_sword",
          itemTemplateResRef,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      const port = new HttpAreaApiPort(
        fetchStub as unknown as typeof fetch,
        "http://localhost:3000/api/v1",
      );

      await expect(port.getAreaById("token", "area_item_template_resref_bad"))
        .rejects.toThrow();
    },
  );

  it("maps and detaches one exact ordered ground-item VarTable provenance", async () => {
    const itemVariables = { expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int", value: -1 },
      { sourceIndex: 1, name: "Scale", type: "float", value: 1.5 },
      { sourceIndex: 2, name: "", type: "string", value: "" },
    ] } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:variables",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemVariables,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_variables");

    expect(area.objects[0]?.itemVariables).toStrictEqual(itemVariables);
    expect(area.objects[0]?.itemVariables?.expectedEntries)
      .not.toBe(itemVariables.expectedEntries);
  });

  it.each([
    ["non-Item owner", "placeable", { expectedEntries: [] }],
    ["invalid source order", "item", {
      expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }],
    }],
    ["inexact float", "item", {
      expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }],
    }],
  ])("rejects ground-item VarTable provenance with %s", async (
    _label,
    kind,
    itemVariables,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:variables_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemVariables,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_variables_bad")).rejects.toThrow();
  });

  it("maps and detaches one exact ordered ground-item PropertiesList provenance", async () => {
    const itemPropertyList = {
      present: true,
      expectedEntries: [{
        sourceIndex: 0,
        propertyName: 48,
        subtype: 7,
        costTable: 24,
        costValue: 9,
        param1: 1,
        param1Value: 2,
        chanceAppear: 75,
      }],
    } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:properties_list",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemPropertyList,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_properties_list");

    expect(area.objects[0]?.itemPropertyList).toStrictEqual(itemPropertyList);
    expect(area.objects[0]?.itemPropertyList).not.toBe(itemPropertyList);
    expect(area.objects[0]?.itemPropertyList?.expectedEntries)
      .not.toBe(itemPropertyList.expectedEntries);
  });

  it.each([
    ["non-Item owner", "placeable", { present: true, expectedEntries: [] }],
    ["entries on physical absence", "item", {
      present: false,
      expectedEntries: [{
        sourceIndex: 0, propertyName: 1, subtype: 0xffff, costTable: 2,
        costValue: 3, param1: 0xff, param1Value: 0, chanceAppear: 100,
      }],
    }],
    ["invalid source order", "item", {
      present: true,
      expectedEntries: [{
        sourceIndex: 1, propertyName: 1, subtype: 0xffff, costTable: 2,
        costValue: 3, param1: 0xff, param1Value: 0, chanceAppear: 100,
      }],
    }],
    ["property-48 invariant failure", "item", {
      present: true,
      expectedEntries: [{
        sourceIndex: 0, propertyName: 48, subtype: 7, costTable: 23,
        costValue: 9, param1: 1, param1Value: 2, chanceAppear: 75,
      }],
    }],
  ])("rejects ground-item PropertiesList provenance with %s", async (
    _label,
    kind,
    itemPropertyList,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:properties_list_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemPropertyList,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_properties_list_bad"))
      .rejects.toThrow();
  });

  it("maps and detaches one exact retained ground-item inventory", async () => {
    const itemInventoryItems = [
      { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
      { sourceIndex: 1, resRef: "nw_it_gem001", x: 3, y: 4 },
    ] as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:inventory",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemInventoryItems,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_inventory");

    expect(area.objects[0]?.itemInventoryItems).toStrictEqual(itemInventoryItems);
    expect(area.objects[0]?.itemInventoryItems).not.toBe(itemInventoryItems);
  });

  it.each([
    ["non-Item owner", "placeable", []],
    ["invalid source order", "item", [
      { sourceIndex: 1, resRef: "nw_it_gold001", x: 1, y: 2 },
    ]],
    ["identity alias", "item", [
      { sourceIndex: 0, templateResRef: "nw_it_gold001", x: 1, y: 2 },
    ]],
    ["non-Word coordinate", "item", [
      { sourceIndex: 0, resRef: "nw_it_gold001", x: 65_536, y: 2 },
    ]],
    ["mode flag", "item", [
      { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2, infinite: false },
    ]],
  ])("rejects retained ground-item inventory with %s", async (
    _label,
    kind,
    itemInventoryItems,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:inventory_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemInventoryItems,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_inventory_bad"))
      .rejects.toThrow();
  });

  it("maps and detaches exact retained ground-item static visual-transform provenance", async () => {
    const itemVisualTransform = {
      present: true,
      value: {
        scaleX: 0.5,
        scaleY: 0.75,
        scaleZ: 1.25,
        rotateX: -15,
        rotateY: 30,
        rotateZ: 90,
        translateX: 20,
        translateY: -30,
        translateZ: 40,
      },
    } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:visual_transform",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemVisualTransform,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_visual_transform");

    expect(area.objects[0]?.itemVisualTransform).toStrictEqual(itemVisualTransform);
    expect(area.objects[0]?.itemVisualTransform).not.toBe(itemVisualTransform);
    if (area.objects[0]?.itemVisualTransform?.present) {
      expect(area.objects[0].itemVisualTransform.value).not.toBe(itemVisualTransform.value);
    }
  });

  it.each([
    ["non-Item owner", "placeable", { present: false }],
    ["absent value", "item", {
      present: false,
      value: {
        scaleX: 0.5, scaleY: 0.75, scaleZ: 1.25,
        rotateX: -15, rotateY: 30, rotateZ: 90,
        translateX: 20, translateY: -30, translateZ: 40,
      },
    }],
    ["default present vector", "item", {
      present: true,
      value: {
        scaleX: 1, scaleY: 1, scaleZ: 1,
        rotateX: 0, rotateY: 0, rotateZ: 0,
        translateX: 0, translateY: 0, translateZ: 0,
      },
    }],
    ["non-binary32 component", "item", {
      present: true,
      value: {
        scaleX: 0.1, scaleY: 0.75, scaleZ: 1.25,
        rotateX: -15, rotateY: 30, rotateZ: 90,
        translateX: 20, translateY: -30, translateZ: 40,
      },
    }],
    ["extra member", "item", {
      present: false,
      alias: true,
    }],
  ])("rejects retained ground-item static visual-transform provenance with %s", async (
    _label,
    kind,
    itemVisualTransform,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:visual_transform_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemVisualTransform,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_visual_transform_bad"))
      .rejects.toThrow();
  });

  it("maps and detaches an exact effective baseitems.2da catalog and Item appearance vector", async () => {
    const itemBaseItemCatalog = {
      descriptor: {
        resourceName: "baseitems.2da",
        sourceObjectKey: "modules/current/baseitems.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 4096,
        rowCount: 2,
      },
      rows: [
        {
          rowIndex: 0, label: "simple", modelType: 0, displayName: "Simple",
          invSlotWidth: 1, invSlotHeight: 1,
        },
        {
          rowIndex: 1, nameStrRef: 101, modelType: 2, itemClass: "WSwLs",
          displayName: "Weapon", invSlotWidth: 2, invSlotHeight: 3,
        },
      ],
    } as const;
    const itemBaseAppearance = {
      expectedValue: {
        baseItem: 1,
        modelType: 2,
        appearance: { modelPart1: 7, modelPart2: 8, modelPart3: 9 },
      },
      tableSha256: "b".repeat(64),
      tableRowCount: 2,
    } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        ...areaDetailWithObject({
          objectId: "itm:0:base_appearance",
          sourceIndex: 0,
          kind: "item",
          templateId: "nw_sword",
          itemBaseAppearance,
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }),
        itemBaseItemCatalog,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_base_appearance");

    expect(area.itemBaseItemCatalog).toStrictEqual(itemBaseItemCatalog);
    expect(area.itemBaseItemCatalog).not.toBe(itemBaseItemCatalog);
    expect(area.itemBaseItemCatalog?.rows).not.toBe(itemBaseItemCatalog.rows);
    expect(area.objects[0]?.itemBaseAppearance).toStrictEqual(itemBaseAppearance);
    expect(area.objects[0]?.itemBaseAppearance).not.toBe(itemBaseAppearance);
    expect(area.objects[0]?.itemBaseAppearance?.expectedValue.appearance)
      .not.toBe(itemBaseAppearance.expectedValue.appearance);
  });

  it.each([
    ["partial ModelType 2 vector", "item", {
      expectedValue: {
        baseItem: 1,
        modelType: 2,
        appearance: { modelPart1: 7, modelPart2: 8 },
      },
      tableSha256: "b".repeat(64),
      tableRowCount: 2,
    }],
    ["non-Item owner", "placeable", {
      expectedValue: {
        baseItem: 0,
        modelType: 0,
        appearance: { modelPart1: 7 },
      },
      tableSha256: "b".repeat(64),
      tableRowCount: 2,
    }],
  ])("rejects %s Item BaseItem/appearance provenance", async (
    _label,
    kind,
    itemBaseAppearance,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:base_appearance_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemBaseAppearance,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_base_appearance_bad"))
      .rejects.toThrow();
  });

  it("maps and detaches one exact ground-item localized-string storage triple", async () => {
    const itemLocalizedStrings = {
      localizedName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "IFN3b3JkIA==" }],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [],
      },
      identifiedDescription: { present: false },
    } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:localized_strings",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemLocalizedStrings,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_localized_strings");

    expect(area.objects[0]?.itemLocalizedStrings).toStrictEqual(itemLocalizedStrings);
    expect(area.objects[0]?.itemLocalizedStrings?.localizedName.entries)
      .not.toBe(itemLocalizedStrings.localizedName.entries);
  });

  it.each([
    ["non-Item owner", "placeable", {
      localizedName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: { present: true, strRef: 0xffff_ffff, entries: [] },
      identifiedDescription: { present: true, strRef: 0xffff_ffff, entries: [] },
    }],
    ["incomplete triple", "item", {
      localizedName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: { present: true, strRef: 0xffff_ffff, entries: [] },
    }],
    ["noncanonical bytes", "item", {
      localizedName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "not canonical" }],
      },
      description: { present: true, strRef: 0xffff_ffff, entries: [] },
      identifiedDescription: { present: true, strRef: 0xffff_ffff, entries: [] },
    }],
  ])("rejects ground-item localized strings with %s", async (
    _label,
    kind,
    itemLocalizedStrings,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:localized_strings_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemLocalizedStrings,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_localized_strings_bad"))
      .rejects.toThrow();
  });

  it("maps one exact ground-item instance-state storage tuple", async () => {
    const itemInstanceState = {
      presentFields: [
        "charges",
        "cost",
        "stolen",
        "stackSize",
        "plot",
        "addCost",
        "identified",
        "cursed",
      ],
      values: {
        charges: 255,
        cost: 0xffff_ffff,
        stolen: true,
        stackSize: 0xffff,
        plot: false,
        addCost: 17,
        identified: true,
        cursed: false,
      },
    } as const;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:state",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemInstanceState,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_item_state");

    expect(area.objects[0]?.itemInstanceState).toStrictEqual(itemInstanceState);
  });

  it.each([
    ["non-Item owner", "placeable", {
      presentFields: [],
      values: {
        charges: 50, cost: 0, stolen: false, stackSize: 1,
        plot: false, addCost: 0, identified: false, cursed: false,
      },
    }],
    ["noncanonical presence order", "item", {
      presentFields: ["cost", "charges"],
      values: {
        charges: 1, cost: 2, stolen: false, stackSize: 1,
        plot: false, addCost: 0, identified: false, cursed: false,
      },
    }],
    ["nondefault absent value", "item", {
      presentFields: [],
      values: {
        charges: 51, cost: 0, stolen: false, stackSize: 1,
        plot: false, addCost: 0, identified: false, cursed: false,
      },
    }],
    ["out-of-range scalar", "item", {
      presentFields: ["charges"],
      values: {
        charges: 256, cost: 0, stolen: false, stackSize: 1,
        plot: false, addCost: 0, identified: false, cursed: false,
      },
    }],
  ])("rejects ground-item instance state with %s", async (_label, kind, itemInstanceState) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:state_bad",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemInstanceState,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_state_bad")).rejects.toThrow();
  });

  it.each([
    ["non-string value", 7, "item"],
    ["embedded NUL", "invalid\u0000comment", "item"],
    ["overlong value", "x".repeat(4097), "item"],
    ["non-Item owner", "valid comment", "placeable"],
  ])("rejects a ground-item editor comment with %s at the HTTP boundary", async (
    _label,
    editorComment,
    kind,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "itm:0:comment",
        sourceIndex: 0,
        kind,
        templateId: "nw_sword",
        itemMetadata: { editorComment },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_item_comment_bad")).rejects.toThrow();
  });

  it.each([
    ["non-string value", 7, "store"],
    ["embedded NUL", "invalid\u0000comment", "store"],
    ["overlong value", "x".repeat(4097), "store"],
    ["non-Store owner", "valid comment", "placeable"],
  ])("rejects a Store editor comment with %s at the HTTP boundary", async (
    _label,
    editorComment,
    kind,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:comment",
        sourceIndex: 0,
        kind,
        templateId: "x2_merc_dye",
        storeMetadata: { editorComment },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_store_comment_bad")).rejects.toThrow();
  });

  it("maps and detaches one exact Encounter editor Comment", async () => {
    const encounterMetadata = { editorComment: "  source note  ", opaque: 7 };
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "enc:0:comment",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "x2_gnoll001",
        encounterMetadata,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_encounter_comment");

    expect(area.objects[0]?.encounterMetadata).toEqual(encounterMetadata);
    expect(area.objects[0]?.encounterMetadata).not.toBe(encounterMetadata);
  });

  it.each([
    ["non-string value", 7, "encounter"],
    ["embedded NUL", "invalid\u0000comment", "encounter"],
    ["overlong value", "x".repeat(4097), "encounter"],
    ["non-Encounter owner", "valid comment", "placeable"],
  ])("rejects an Encounter editor comment with %s at the HTTP boundary", async (
    _label,
    editorComment,
    kind,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "enc:0:comment",
        sourceIndex: 0,
        kind,
        templateId: "x2_gnoll001",
        encounterMetadata: { editorComment },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_encounter_comment_bad"))
      .rejects.toThrow();
  });

  it.each([
    ["partial vector", {
      markUp: 100, markDown: 65, blackMarket: false, blackMarketMarkDown: 25,
      identifyPrice: 100, maxBuyPrice: -1,
    }, "store"],
    ["extra field", {
      markUp: 100, markDown: 65, blackMarket: false, blackMarketMarkDown: 25,
      identifyPrice: 100, maxBuyPrice: -1, storeGold: -1, inventory: 0,
    }, "store"],
    ["fractional signed int", {
      markUp: 1.5, markDown: 65, blackMarket: false, blackMarketMarkDown: 25,
      identifyPrice: 100, maxBuyPrice: -1, storeGold: -1,
    }, "store"],
    ["non-boolean BlackMarket", {
      markUp: 100, markDown: 65, blackMarket: 0, blackMarketMarkDown: 25,
      identifyPrice: 100, maxBuyPrice: -1, storeGold: -1,
    }, "store"],
    ["non-Store owner", {
      markUp: 100, markDown: 65, blackMarket: false, blackMarketMarkDown: 25,
      identifyPrice: 100, maxBuyPrice: -1, storeGold: -1,
    }, "placeable"],
  ])("rejects Store commerce with %s at the HTTP boundary", async (
    _label,
    commerce,
    kind,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:commerce",
        sourceIndex: 0,
        kind,
        templateId: "x2_merc_dye",
        storeMetadata: { commerce },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_store_commerce_bad")).rejects.toThrow();
  });

  it.each([
    ["partial pair", { onOpenStore: "store_open" }, "store"],
    ["punctuation", { onOpenStore: "bad-name", onStoreClosed: "store_closed" }, "store"],
    ["overlong value", { onOpenStore: "x".repeat(17), onStoreClosed: "" }, "store"],
    ["extra member", { onOpenStore: "", onStoreClosed: "", extra: "value" }, "store"],
    ["non-Store owner", { onOpenStore: "", onStoreClosed: "" }, "placeable"],
  ])("rejects Store script ResRefs with %s at the HTTP boundary", async (
    _label,
    scriptResRefs,
    kind,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:scripts",
        sourceIndex: 0,
        kind,
        templateId: "x2_merc_dye",
        storeMetadata: { scriptResRefs },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_store_scripts_bad")).rejects.toThrow();
  });

  it.each([
    ["non-contiguous sourceIndex", {
      expectedEntries: [{ sourceIndex: 1, name: "Counter", type: "int", value: 1 }],
    }, "store"],
    ["non-float32 value", {
      expectedEntries: [{ sourceIndex: 0, name: "Scale", type: "float", value: 0.1 }],
    }, "store"],
    ["extra member", { expectedEntries: [], extra: true }, "store"],
    ["non-Store owner", { expectedEntries: [] }, "placeable"],
  ])("rejects Store VarTable provenance with %s at the HTTP boundary", async (
    _label,
    variables,
    kind,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "sto:0:variables",
        sourceIndex: 0,
        kind,
        templateId: "x2_merc_dye",
        storeMetadata: { variables },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_store_variables_bad")).rejects.toThrow();
  });

  it.each([
    ["non-string value", 7, "creature"],
    ["embedded NUL", "invalid\u0000comment", "creature"],
    ["overlong value", "x".repeat(4097), "creature"],
    ["non-Creature owner", "valid comment", "placeable"],
  ])("rejects a Creature editor comment with %s at the HTTP boundary", async (
    _label,
    editorComment,
    kind,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: areaDetailWithObject({
        objectId: "cre:0:comment",
        sourceIndex: 0,
        kind,
        templateId: "nw_guard",
        creatureMetadata: { editorComment },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_creature_comment_bad"))
      .rejects.toThrow();
  });

  it("maps one exact Area-owned VarTable provenance payload without normalization", async () => {
    const expectedEntries = [
      { sourceIndex: 0, name: "PLG_AREA_FREEZE_DISEASE", type: "int", value: 1 },
      { sourceIndex: 1, name: "Scale", type: "float", value: Math.fround(1.25) },
      { sourceIndex: 2, name: "", type: "string", value: "" },
    ];
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_root_variables",
      name: "Root Variables",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      variables: { expectedEntries },
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
      updatedAt: "2026-08-24T00:00:00.000Z",
      objects: [],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    const area = await port.getAreaById("token", "area_root_variables");
    expect(area.variables).toEqual({ expectedEntries });
    expect(area.variables?.expectedEntries).not.toBe(expectedEntries);
  });

  it("rejects malformed Area-owned VarTable provenance at the HTTP boundary", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: {
      areaId: "area_root_variables_bad",
      name: "Root Variables",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      variables: {
        expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }],
      },
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
      updatedAt: "2026-08-24T00:00:00.000Z",
      objects: [],
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_root_variables_bad")).rejects.toThrow();
  });

  it("maps exact Placeable TemplateResRef storage without normalization", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_template_resref",
        name: "Template ResRef",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
        composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
        updatedAt: "2026-08-19T00:00:00.000Z",
        objects: [{
          objectId: "plc:0:template",
          kind: "placeable",
          templateId: "renderer_identity",
          placeableTemplateResRef: "plc_chest",
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const area = await port.getAreaById("token", "area_template_resref");
    expect(area.objects[0]?.placeableTemplateResRef).toBe("plc_chest");
  });

  it("logs in and returns backend access token", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            session: {
              accessToken: "token_123"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.login("viewer.user", "viewer123");

    expect(result.accessToken).toBe("token_123");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/login",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("lists areas with encoded query params", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                areaId: "area_001",
                name: "Area One",
                biome: "urban",
                width: 24,
                height: 24,
                tags: ["benchmark"],
                benchmark: true,
                previewImageUrl: "/assets/previews/areas/area_001.webp",
                textureAtlasId: "atlas_area_001",
                objectCounts: {
                  placeables: 2,
                  doors: 1,
                  creatures: 3,
                  items: 4,
                  sounds: 5,
                  total: 15
                },
                updatedAt: "2026-05-27T10:00:00.000Z"
              }
            ],
            total: 1,
            limit: 20,
            offset: 0
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.listAreas("token_abc", {
      query: "market",
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.areaId).toBe("area_001");
    expect(result.items[0]).toMatchObject({
      previewImageUrl: "/assets/previews/areas/area_001.webp",
      textureAtlasId: "atlas_area_001",
      objectCounts: {
        placeables: 2,
        doors: 1,
        creatures: 3,
        items: 4,
        sounds: 5,
        total: 15
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas?query=market&benchmark=true&limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("downloads placed area item GIT export bytes", async () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x54, 0x20, 0x56, 0x33, 0x2e, 0x32]);
    const fetchStub = vi.fn(async () =>
      new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": 'inline; filename="area_001.items.git"',
          "X-Aurora-Area-Item-Count": "2"
        }
      })
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.exportAreaItemsGit("token_abc", "area_001");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/export/items.git",
      {
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      }
    );
    expect(result.contentType).toBe("application/octet-stream");
    expect(result.fileName).toBe("area_001.items.git");
    expect(result.itemCount).toBe(2);
    expect(result.sizeBytes).toBe(bytes.byteLength);
    expect([...new Uint8Array(result.bytes)]).toEqual([...bytes]);
  });

  it("downloads whole-area GIT export bytes", async () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x54, 0x20, 0x56, 0x33, 0x2e, 0x32]);
    const fetchStub = vi.fn(async () =>
      new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": 'inline; filename="area_001.git"',
          "X-Aurora-Area-Object-Count": "9",
          "X-Aurora-Area-Item-Count": "2"
        }
      })
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.exportAreaGit("token_abc", "area_001");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/export/area.git",
      {
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      }
    );
    expect(result.fileName).toBe("area_001.git");
    expect(result.objectCount).toBe(9);
    expect(result.itemCount).toBe(2);
    expect(result.sizeBytes).toBe(bytes.byteLength);
  });

  it("downloads whole-area ARE export bytes", async () => {
    const bytes = new Uint8Array([0x41, 0x52, 0x45, 0x20, 0x56, 0x33, 0x2e, 0x32]);
    const fetchStub = vi.fn(async () =>
      new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": 'inline; filename="area_001.are"',
          "X-Aurora-Area-Tile-Count": "144"
        }
      })
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.exportAreaAre("token_abc", "area_001");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/export/area.are",
      {
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      }
    );
    expect(result.fileName).toBe("area_001.are");
    expect(result.tileCount).toBe(144);
    expect(result.sizeBytes).toBe(bytes.byteLength);
  });

  it("fetches area lighting evidence", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            summary: {
              areasScanned: 1,
              tileLightTiles: 1,
              tileLightReferences: 2,
              tileLightAreas: 1,
              areaGlobalLightingAreas: 1,
              areaGlobalLightingFields: 3,
              areaShadowOpacityAreas: 1,
              placeableNameCandidates: 1,
              placeableNameCandidateAreas: 1,
              catalogLightSourceTemplates: 1,
              catalogLightColorTemplates: 1,
              catalogLightStateTemplates: 1,
              processedMdlLightTemplatesScanned: 1,
              processedMdlLightSourceTemplates: 1,
              processedMdlLightNodes: 1,
              processedMdlLightScanLimit: 24,
              auroraActiveLightSlotCap: 128,
              rendererCandidateLights: 129,
              rendererAcceptedLights: 128,
              rendererDroppedLights: 1,
              shadowDiagnosticEntries: 3,
              shadowMdlLightNodes: 1,
              shadowCatalogShadowSizeTemplates: 1,
              auditCoverageEntries: 5,
              auditCoverageSourceBacked: 2,
              auditCoveragePreviewOnly: 0,
              auditCoverageBlocked: 3,
              auditCoverageNotObserved: 0,
              auditGaps: 3,
              remainingRetailBlockers: 3
            },
            tileLights: [
              {
                areaId: "area_001",
                areaName: "Area One",
                tileInstanceId: "area_001:tile:0",
                row: 0,
                col: 0,
                tileIndex: 0,
                tileId: 101,
                tilesetResRef: "tno01",
                modelResRef: "tno01_a01_01",
                mainLight1: 3,
                sourceLight1: 5,
                mainLight1Color: {
                  rowId: 3,
                  red: 1,
                  green: 0.75,
                  blue: 0.25,
                  sourceKey: "modules/current/__aurora/sources/vanilla/lightcolor.2da",
                  nativeNode: {
                    status: "main-native-node-resolved",
                    name: "tno01_a01_01ml1",
                    position: [0, 0, 5],
                    coordinateSpace: "model-local-aurora-z-up",
                    radius: 14,
                    multiplier: 1,
                    lightPriority: 5,
                    ambientOnly: false,
                    dynamicType: 0,
                    affectDynamic: true,
                    shadow: false,
                    sourceModelFileName: "tno01_a01_01.mdl",
                    sourceModelObjectKey:
                      "modules/current/__aurora/sources/vanilla/tno01_a01_01.mdl",
                    sourceModelHash: "tile-model-sha256",
                    proofStatus: "source-backed-tile-mdl-native-main-light"
                  }
                },
                sourceLight1Color: {
                  rowId: 5,
                  red: 0.25,
                  green: 0.5,
                  blue: 1,
                  sourceKey: "modules/current/__aurora/sources/vanilla/fx_flame01.mdl",
                  sourceNode: {
                    status: "source-node-resolved",
                    slotIndex: 1,
                    sourceNodeCount: 1,
                    name: "tno01_a01_01sl1",
                    position: [-1.25, 1.5, 1],
                    coordinateSpace: "model-local-aurora-z-up",
                    sourceModelFileName: "tno01_a01_01.mdl",
                    sourceModelObjectKey:
                      "modules/current/__aurora/sources/vanilla/tno01_a01_01.mdl",
                    sourceModelHash: "tile-model-sha256",
                    proofStatus: "source-backed-tile-mdl-source-light-slot-count"
                  }
                },
                animLoop1: 1
              }
            ],
            areaGlobalLighting: [
              {
                areaId: "area_001",
                areaName: "Area One",
                source: "are-root-fields",
                fields: [
                  { field: "LightingScheme", value: 2 },
                  { field: "ShadowOpacity", value: 80 },
                  { field: "SunAmbientColor", value: 16764057 }
                ]
              }
            ],
            placeableNameCandidates: [
              {
                areaId: "area_001",
                areaName: "Area One",
                objectId: "obj_torch_001",
                templateId: "plc_wall_torch",
                resRef: "plc_wall_torch",
                x: 1,
                y: 2,
                z: 0,
                matchedTokens: ["torch"]
              }
            ],
            catalogLightSources: [
              {
                templateId: "plc_magic_yellow",
                resref: "plc_magic_yellow",
                name: "Magic Yellow",
                category: "light",
                tags: ["light_source"],
                evidence: ["catalog.light_source", "placeables.2da.LightColor", "utp.LightState"],
                source2daLightColorRaw: "7",
                source2daLightColorRow: 7,
                source2daLightColorLabel: "Yellow",
                source2daLightRed: 1.9,
                source2daLightGreen: 1.7,
                source2daLightBlue: 0.06,
                source2daLightOffsetZ: 4,
                source2daShadowSize: 1,
                lightState: 2,
                modelResRef: "plc_u07"
              }
            ],
            processedMdlLightSources: [
              {
                templateId: "plc_magic_yellow",
                resref: "plc_magic_yellow",
                name: "Magic Yellow",
                modelResRef: "plc_u07",
                cacheKey: "cache_plc_magic_yellow",
                cacheHit: false,
                nodes: [
                  {
                    source: "aurora-mdl-ascii",
                    sourceModelAssetId: "asset_plc_u07",
                    sourceModelFileName: "plc_u07.mdl",
                    sourceModelObjectKey: "modules/current/models/plc_u07.mdl",
                    nodeName: "light01",
                    sourceNodeKind: "placeablelight",
                    position: { x: 0, y: 0, z: 1.25 },
                    radius: 6,
                    quadraticAtten: 0.125,
                    quadraticAttenSource:
                      "C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten = 9/(max(radius,0.1)^2*2)",
                    quadraticAttenProofStatus: "source-backed-mdl-radius-quadratic-attenuation",
                    auroraLightFieldParserSource:
                      "C:/Projects/New Folder/export/decompiled_all.c:883029-883250 FUN_00a5872c parses AuroraLight color into +0x54, radius into +0x58, shadowradius into +0x60, verticaldisplacement into +0x64, multiplier into +0x8c, shadow into +0xc0, and lightpriority into +0xb0",
                    auroraLightFieldParserProofStatus:
                      "source-backed-mdl-auroralight-field-parser",
                    color: { red: 1, green: 0.85, blue: 0.15 },
                    shadow: true,
                    lightPriority: 3,
                    animationNames: ["default"]
                  }
                ]
              }
            ],
            rendererLightBudget: {
              activeLightSlotCap: 128,
              candidateLights: 129,
              acceptedLights: 128,
              droppedLights: 1,
              sampledCandidateLights: 2,
              omittedCandidateLights: 127,
              priorityStrategy:
                "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback",
              priorityStrategyProofStatus:
                "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback",
              retailMdlLightScoreSource:
                "C:/Projects/New Folder/export/decompiled_all.c:865838-865911 FUN_00a41850 writes per-light score at +0x84 from distance/radius/multiplier/priority fields",
              retailMdlLightSortSource:
                "C:/Projects/New Folder/export/decompiled_all.c:865710-865782 FUN_00a4165c/FUN_00a417bc sort active/shadow light lists with FUN_00a41694 comparator on +0x84",
              retailActiveLightSortScoreSource:
                "C:/Projects/New Folder/export/decompiled_all.c:865731-865735 FUN_00a41694 compares active-light score field +0x84 with '<'",
              retailActiveLightSortScoreFormula:
                "ascending +0x84 score; invalid radius/multiplier/extent -> 100000",
              retailActiveLightSortDirection: "ascending-score-field-0x84",
              retailActiveLightSortScoreProofStatus:
                "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked",
              retailActiveLightUploadSource:
                "C:/Projects/New Folder/export/decompiled_all.c:866101-866201 FUN_00a41e50 applies min(configured,0x80)",
              retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering",
              candidates: [
                {
                  candidateId: "mdl:plc_magic_yellow:modules/current/models/plc_u07.mdl:light01:0",
                  source: "processed-mdl-light-node",
                  label: "Magic Yellow:light01",
                  priority: 300,
                  rank: 1,
                  accepted: true,
                  templateId: "plc_magic_yellow",
                  resref: "plc_magic_yellow",
                  nodeName: "light01",
                  lightPriority: 3,
                  retailMdlScoreSource:
                    "C:/Projects/New Folder/export/decompiled_all.c:865838-865911 FUN_00a41850 writes per-light score at +0x84",
                  retailMdlScoreProofStatus:
                    "source-backed-mdl-lightmanager-score-exact-runtime-inputs-not-available-in-area-audit",
                  retailMdlPreviewScore: 0.17857142857142858,
                  retailMdlPreviewScorePriority: 3,
                  retailMdlPreviewScorePreviewDistance: 1.25,
                  retailMdlPreviewScoreRangeTerm: 6,
                  retailMdlPreviewScoreFormula:
                    "invalid radius/multiplier/extent -> 100000; current-object lane -> -1; otherwise ((priority+1)*previewDistance)/((field0x70+4)*(rangeTerm+1)), rangeTerm=sourceRadius*multiplier*runtimeExtent",
                  retailMdlPreviewScoreSource:
                    "C:/Projects/New Folder/export/decompiled_all.c:865731-865735 FUN_00a41694 compares active-light score field +0x84 with '<'",
                  retailMdlPreviewScoreProofStatus:
                    "source-backed-retail-lightmanager-score-preview-input-fallback",
                  retailMdlPreviewScoreSortDirection: "ascending-score-field-0x84-preview",
                  retailMdlPreviewScoreFallback:
                    "area-audit-object-local-distance-field0x70-zero-runtimeextent-one-cross-lane-callsite-blocked",
                  prioritySource:
                    "processed MDL lane uses recovered LightManager preview score for intra-lane order; cross-lane priority remains diagnostic because insertion order is unrecovered"
                },
                {
                  candidateId: "catalog:plc_magic_yellow",
                  source: "catalog-light-source-template",
                  label: "Magic Yellow",
                  priority: 122,
                  rank: 129,
                  accepted: false,
                  dropReason: "aurora-active-light-slot-cap",
                  templateId: "plc_magic_yellow",
                  resref: "plc_magic_yellow"
                }
              ]
            },
            shadowDiagnostic: {
              entries: [
                {
                  entryId: "area-shadow:area_001:ShadowOpacity",
                  source: "area-root-shadow-field",
                  label: "Area One:ShadowOpacity",
                  severity: "info",
                  note: "ARE root shadow field preserved from area metadata.",
                  areaId: "area_001",
                  areaName: "Area One",
                  field: "ShadowOpacity",
                  value: 80
                },
                {
                  entryId: "mdl-shadow:plc_magic_yellow:light01:0",
                  source: "processed-mdl-light-node",
                  label: "Magic Yellow:light01",
                  severity: "info",
                  note: "MDL light node requests shadow.",
                  templateId: "plc_magic_yellow",
                  resref: "plc_magic_yellow",
                  nodeName: "light01",
                  shadow: true,
                  rendererRank: 1,
                  rendererAccepted: true
                },
                {
                  entryId: "catalog-shadow:plc_magic_yellow",
                  source: "catalog-placeable-shadow-size",
                  label: "Magic Yellow",
                  severity: "info",
                  note: "placeables.2da ShadowSize is present on this light-source template.",
                  templateId: "plc_magic_yellow",
                  resref: "plc_magic_yellow",
                  shadowSize: 1
                }
              ],
              shadowRelevantEntries: 3,
              sampledEntries: 3,
              omittedEntries: 0,
              globalShadowFields: 1,
              areaShadowOpacityFields: 1,
              areaSunShadowFields: 0,
              areaMoonShadowFields: 0,
              mdlShadowLightNodes: 1,
              mdlExplicitNonShadowLightNodes: 0,
              catalogShadowSizeTemplates: 1
            },
            auditCoverage: [
              {
                key: "area-tile-light-color",
                label: "ARE tile light color",
                status: "source-backed",
                evidence: "2/2 non-zero tile light ids carry decoded 2DA RGB metadata (2 raw fields scanned; 0 decoded RGB entries are black and are not renderer candidates).",
                proof: "decompiled_all.c:255400-255409 reads Tile_MainLight*/Tile_SrcLight*; decompiled_all.c:40249-40266 loads lightcolor/tilecolor tables."
              },
              {
                key: "placeable-radius-falloff",
                label: "Placeable light radius/falloff",
                status: "source-backed",
                evidence:
                  "Catalog light colors exist and retail placeable carrier radius/falloff is recovered from fx_placeable01/AuroraLight01 plus active-light falloff code.",
                proof:
                  "nwmain.exe CNWCArea::AddPlaceableObjectLight uses fx_placeable01/AuroraLight01; nwn_base.key fx_placeable01.mdl controller radius 0x58 = 10, shadowradius 0x60 = 15, verticaldisplacement 0x64 = 3; C:/Projects/New Folder/export/decompiled_all.c:866543-866563 proves linear max(0,1-distance/radius) active-light falloff"
              },
              {
                key: "item-property-light-runtime-scheduler",
                label: "ItemPropertyLight runtime scheduler",
                status: "blocked",
                evidence:
                  "Retail ApplyLight bridge to VFX_DUR_LIGHT rows, retail KEY/BIF item-light tables, progfx.2da Param3 item-light shadow toggle, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation, and generic MdlNodeLight PartLight creation/Gob-list attach are recovered and ItemPropertyLight parameter/color/radius/shadow-toggle family is represented in previews, but cross-lane insertion and retail shadow-volume projection parity are still not recovered.",
                proof:
                  "nwserver.exe CNWSItemPropertyHandler::ApplyLight at 0x140405e40; nwmain.exe ApplyLight disassembly maps color byte [CNWItemProperty+9] and brightness word [CNWItemProperty+6] to VFX_DUR_LIGHT rows; nwn_base.key -> base_2da.bif contains iprp_lightcost.2da rows 1..4 Dim 5m/Low 10m/Normal 15m/Bright 20m and iprp_color.2da rows 0..6 Blue/Yellow/Purple/Red/Green/Orange/White",
                blocker:
                  "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered"
              },
              {
                key: "progfx-type4-runtime-scheduler",
                label: "ProgFX Type 4 runtime scheduler",
                status: "blocked",
                evidence:
                  "ProgFX Type 4 owner-phase metadata, Param1..Param7 source-table values, docs-backed Param4 priority/Param5 proximity/Param6 attach-to-scene/vision policy semantics, client receive/render object attach, source-model Gob instantiation, and vanilla absence of non-item cast-shadow rows are preserved for diagnostics, but exact retail owner grouping, proximity distance threshold, scene-light restore timing, vision mutation pixels, and cross-lane scheduling are still not recovered.",
                proof:
                  "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; backend/scripts/audit-retail-light-function-disasm.py recovers object-level looping VFX owner add/remove, CNWSMessage game-object update serialization, and clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path",
                blocker:
                  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity"
              },
              {
                key: "renderer-active-light-ordering",
                label: "Renderer active light ordering",
                status: "blocked",
                evidence:
                  "Preview diagnostic orders candidates with source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback; retail cross-lane insertion order is not recovered.",
                proof:
                  "C:/Projects/New Folder/export/decompiled_all.c:865534-865548 FUN_00a4128c inserts a light into the manager lists",
                blocker:
                  "FUN_00a4128c internal insertion is recovered, but decompilation does not expose a direct symbolized call-site proving cross-lane precedence"
              }
            ],
            auditGaps: [
              {
                key: "item-property-light-runtime-scheduler",
                label: "ItemPropertyLight runtime scheduler",
                status: "blocked",
                evidence:
                  "Retail ApplyLight bridge to VFX_DUR_LIGHT rows, retail KEY/BIF item-light tables, progfx.2da Param3 item-light shadow toggle, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation, and generic MdlNodeLight PartLight creation/Gob-list attach are recovered and ItemPropertyLight parameter/color/radius/shadow-toggle family is represented in previews, but cross-lane insertion and retail shadow-volume projection parity are still not recovered.",
                proof:
                  "nwserver.exe CNWSItemPropertyHandler::ApplyLight at 0x140405e40; nwmain.exe ApplyLight disassembly maps color byte [CNWItemProperty+9] and brightness word [CNWItemProperty+6] to VFX_DUR_LIGHT rows; nwn_base.key -> base_2da.bif contains iprp_lightcost.2da rows 1..4 Dim 5m/Low 10m/Normal 15m/Bright 20m and iprp_color.2da rows 0..6 Blue/Yellow/Purple/Red/Green/Orange/White",
                blocker:
                  "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered",
                nextStep:
                  "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered"
              },
              {
                key: "progfx-type4-runtime-scheduler",
                label: "ProgFX Type 4 runtime scheduler",
                status: "blocked",
                evidence:
                  "ProgFX Type 4 owner-phase metadata, Param1..Param7 source-table values, docs-backed Param4 priority/Param5 proximity/Param6 attach-to-scene/vision policy semantics, client receive/render object attach, source-model Gob instantiation, and vanilla absence of non-item cast-shadow rows are preserved for diagnostics, but exact retail owner grouping, proximity distance threshold, scene-light restore timing, vision mutation pixels, and cross-lane scheduling are still not recovered.",
                proof:
                  "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; backend/scripts/audit-retail-light-function-disasm.py recovers object-level looping VFX owner add/remove, CNWSMessage game-object update serialization, and clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path",
                blocker:
                  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity",
                nextStep:
                  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity"
              },
              {
                key: "renderer-active-light-ordering",
                label: "Renderer active light ordering",
                status: "blocked",
                evidence:
                  "Preview diagnostic orders candidates with source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback; retail cross-lane insertion order is not recovered.",
                proof:
                  "C:/Projects/New Folder/export/decompiled_all.c:865534-865548 FUN_00a4128c inserts a light into the manager lists",
                blocker:
                  "FUN_00a4128c internal insertion is recovered, but decompilation does not expose a direct symbolized call-site proving cross-lane precedence",
                nextStep:
                  "FUN_00a4128c internal insertion is recovered, but decompilation does not expose a direct symbolized call-site proving cross-lane precedence"
              }
            ],
            remainingRetailBlockers: [
              {
                key: "retail-shadow-volume-projection-parity",
                label: "Retail shadow-volume projection parity",
                status: "blocked",
                affectedCoverageKeys: [
                  "area-shadow-volume-implementation",
                  "placeable-2da-light-offset-shadow"
                ],
                evidence:
                  "Retail shadow-plane/shadow-volume inputs are source-backed.",
                proof:
                  "backend/scripts/audit-retail-light-function-disasm.py shadowVolumeProjectionEvidence proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked",
                requiredEvidence:
                  "Port or prove equivalent caster traversal/extrusion/projection through FUN_00a78128.",
                oracleCases: [
                  {
                    caseId: "shadowvol-campfire-pixel-geometry-opacity",
                    purpose: "Compare projected shadow footprint and opacity.",
                    requiredArtifacts: [
                      "retail-or-toolset-shadowvol-campfire.png",
                      "shadowvol-campfire-pixel-compare.json"
                    ],
                    acceptanceGate: "Retail and Aurora Web shadow pixels match tolerance.",
                    currentStatus: "partial-local-proof",
                    currentEvidence: [
                      "placeable-campfire-shadowvol-state-proof-2026-07-03.frame.json"
                    ],
                    blocker: "Retail/toolset shadow pixel oracle is missing."
                  }
                ],
                nextStep:
                  "Recover the shadow-volume caster extrusion path around FUN_00a78128."
              },
              {
                key: "retail-cross-lane-active-light-ordering",
                label: "Retail cross-lane active light ordering",
                status: "blocked",
                affectedCoverageKeys: [
                  "renderer-active-light-ordering",
                  "item-property-light-runtime-scheduler",
                  "progfx-type4-runtime-scheduler"
                ],
                evidence:
                  "Active-light score/sort/upload and LightManager insertion are recovered.",
                proof:
                  "LightManager targetCount=23/requestedTargetCount=4, directCallXrefCount=23, requestedDirectCallXrefCount=0",
                requiredEvidence:
                  "Recover common insertion/merge order between tile/placeable/MDL/item/VFX lanes.",
                oracleCases: [
                  {
                    caseId: "cross-lane-all-required-lanes-retail-precedence",
                    purpose: "Observe accepted and dropped lanes under a retail light budget.",
                    requiredArtifacts: [
                      "retail-cross-lane-active-slots.json",
                      "cross-lane-precedence-compare.json"
                    ],
                    acceptanceGate: "Accepted and dropped lanes match retail.",
                    currentStatus: "partial-local-proof",
                    currentEvidence: [
                      "cross-lane-all-light-lanes-runtime-probe-2026-07-05.frame.json"
                    ],
                    blocker: "Retail lane precedence is missing."
                  }
                ],
                nextStep: "Continue binary/xref audit around LightManager vtable callers."
              },
              {
                key: "progfx-type4-priority-proximity-vision-scheduler",
                label: "ProgFX Type 4 priority/proximity/vision scheduler",
                status: "blocked",
                affectedCoverageKeys: ["progfx-type4-runtime-scheduler"],
                evidence:
                  "Param4 priority, Param5 proximity suppression, Param6 scene attachment, and vision Param1 tokens are preserved.",
                proof:
                  "clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path",
                requiredEvidence:
                  "Recover priority ordering, proximity suppression, scene attachment/removal, and vision mutation semantics.",
                oracleCases: [
                  {
                    caseId: "progfx-type4-priority-tie-and-zero-policy",
                    purpose: "Observe retail priority and tie behavior.",
                    requiredArtifacts: ["retail-progfx-priority-policy.json"],
                    acceptanceGate: "Retail priority winner is known.",
                    currentStatus: "partial-local-proof",
                    currentEvidence: [
                      "progfx-type4-multi-request-policy-runtime-probe-2026-07-03.frame.json"
                    ],
                    blocker: "Retail priority/tie behavior is missing."
                  }
                ],
                nextStep:
                  "Trace ProgFX Type 4 scheduler after visualeffects/progfx table resolution."
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaLightingEvidence("token_abc");

    expect(result.summary.tileLightReferences).toBe(2);
    expect(result.summary.auditCoverageBlocked).toBe(3);
    expect(result.summary.auditGaps).toBe(3);
    expect(result.summary.remainingRetailBlockers).toBe(3);
    expect(result.tileLights[0]).toMatchObject({
      areaId: "area_001",
      mainLight1: 3,
      mainLight1Color: {
        rowId: 3,
        red: 1,
        green: 0.75,
        blue: 0.25,
        nativeNode: expect.objectContaining({
          status: "main-native-node-resolved",
          name: "tno01_a01_01ml1",
          position: [0, 0, 5],
          radius: 14,
          sourceModelHash: "tile-model-sha256"
        })
      },
      sourceLight1Color: {
        sourceNode: expect.objectContaining({
          status: "source-node-resolved",
          slotIndex: 1,
          sourceNodeCount: 1,
          name: "tno01_a01_01sl1",
          position: [-1.25, 1.5, 1],
          sourceModelHash: "tile-model-sha256"
        })
      }
    });
    expect(result.areaGlobalLighting[0]).toMatchObject({
      areaId: "area_001",
      fields: expect.arrayContaining([{ field: "ShadowOpacity", value: 80 }])
    });
    expect(result.placeableNameCandidates[0]?.matchedTokens).toEqual(["torch"]);
    expect(result.catalogLightSources[0]).toMatchObject({
      templateId: "plc_magic_yellow",
      evidence: expect.arrayContaining(["placeables.2da.LightColor", "utp.LightState"]),
      source2daLightColorRow: 7,
      source2daLightOffsetZ: 4,
      lightState: 2
    });
    expect(result.processedMdlLightSources[0]).toMatchObject({
      templateId: "plc_magic_yellow",
      nodes: [
        expect.objectContaining({
          nodeName: "light01",
          sourceNodeKind: "placeablelight",
          position: { x: 0, y: 0, z: 1.25 },
          color: { red: 1, green: 0.85, blue: 0.15 },
          quadraticAtten: 0.125,
          quadraticAttenProofStatus: "source-backed-mdl-radius-quadratic-attenuation",
          auroraLightFieldParserSource: expect.stringContaining("FUN_00a5872c"),
          auroraLightFieldParserProofStatus: "source-backed-mdl-auroralight-field-parser",
          shadow: true,
          lightPriority: 3
        })
      ]
    });
    expect(result.auditCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "placeable-radius-falloff",
          status: "source-backed",
          proof: expect.stringContaining("fx_placeable01/AuroraLight01")
        }),
        expect.objectContaining({
          key: "item-property-light-runtime-scheduler",
          status: "blocked",
          blocker: expect.stringContaining(
            "cross-lane insertion order and retail shadow-volume projection parity"
          )
        }),
        expect.objectContaining({
          key: "progfx-type4-runtime-scheduler",
          status: "blocked",
          proof: expect.stringContaining("visualeffects.2da")
        }),
        expect.objectContaining({
          key: "renderer-active-light-ordering",
          status: "blocked",
          proof: expect.stringContaining("FUN_00a4128c")
        })
      ])
    );
    expect(result.auditGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "item-property-light-runtime-scheduler",
          status: "blocked",
          nextStep: expect.stringContaining(
            "cross-lane insertion order and retail shadow-volume projection parity"
          )
        }),
        expect.objectContaining({
          key: "progfx-type4-runtime-scheduler",
          status: "blocked",
          nextStep: expect.stringContaining("Param4/Param5/Param6/vision policy semantics are docs-backed")
        }),
        expect.objectContaining({
          key: "renderer-active-light-ordering",
          status: "blocked",
          nextStep: expect.stringContaining("cross-lane precedence")
        })
      ])
    );
    expect(result.remainingRetailBlockers.map((entry) => entry.key)).toEqual([
      "retail-shadow-volume-projection-parity",
      "retail-cross-lane-active-light-ordering",
      "progfx-type4-priority-proximity-vision-scheduler"
    ]);
    expect(result.remainingRetailBlockers.map((entry) => entry.oracleCases[0]?.caseId)).toEqual([
      "shadowvol-campfire-pixel-geometry-opacity",
      "cross-lane-all-required-lanes-retail-precedence",
      "progfx-type4-priority-tie-and-zero-policy"
    ]);
    expect(result.remainingRetailBlockers[0]?.oracleCases[0]?.requiredArtifacts).toEqual(
      expect.arrayContaining([
        "retail-or-toolset-shadowvol-campfire.png",
        "shadowvol-campfire-pixel-compare.json"
      ])
    );
    expect(result.remainingRetailBlockers[0]).toMatchObject({
      status: "blocked",
      affectedCoverageKeys: [
        "area-shadow-volume-implementation",
        "placeable-2da-light-offset-shadow"
      ],
      requiredEvidence: expect.stringContaining("FUN_00a78128")
    });
    expect(result.rendererLightBudget).toMatchObject({
      activeLightSlotCap: 128,
      candidateLights: 129,
      acceptedLights: 128,
      droppedLights: 1,
      priorityStrategy: "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback",
      priorityStrategyProofStatus:
        "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback",
      retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering"
    });
    expect(result.rendererLightBudget.candidates[1]).toMatchObject({
      accepted: false,
      dropReason: "aurora-active-light-slot-cap"
    });
    expect(result.shadowDiagnostic).toMatchObject({
      shadowRelevantEntries: 3,
      mdlShadowLightNodes: 1,
      catalogShadowSizeTemplates: 1
    });
    expect(result.shadowDiagnostic.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "area-root-shadow-field", field: "ShadowOpacity" }),
        expect.objectContaining({ source: "processed-mdl-light-node", rendererRank: 1 }),
        expect.objectContaining({ source: "catalog-placeable-shadow-size", shadowSize: 1 })
      ])
    );
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/lighting/evidence",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("fetches area detail and maps object placements", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            areaId: "area_001",
            name: "Area One",
            biome: "urban",
            width: 24,
            height: 24,
            tags: ["city"],
            comments: " exact area note\r\nline two ",
            eventScripts: {
              onEnter: "area_enter",
              onExit: "",
              onHeartbeat: "area_heartbeat",
              onUserDefined: "area_user",
            },
            basicIdentity: {
              name: " Exact Area One ",
              nameProfile: "simple_inline_ascii",
              nameEntries: [{ languageId: 0, text: " Exact Area One " }],
              tag: "AREA_ONE_TAG",
            },
            advancedFlags: {
              terrainType: { interior: true, natural: false, subterranean: true },
              playerVsPlayer: 2,
              noRest: false,
              listenCheckModifier: -8,
              spotCheckModifier: 11,
              loadingScreenId: 0xffff,
            },
            moduleStartLocation: {
              areaResRef: "area_001",
              x: Math.fround(1.25),
              y: Math.fround(2.5),
              z: Math.fround(3.75),
              directionX: Math.fround(0),
              directionY: Math.fround(1),
            },
            moduleStartLocationTargets: ["area_001", "area_002"],
            benchmark: false,
            previewImageUrl: "/assets/previews/areas/area_001.webp",
            textureAtlas: {
              atlasId: "atlas_area_001",
              cacheKey: "atlas_area_001:24x24",
              strategy: "blob-cache",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              etag: "atlas-area-001"
            },
            tileSet: "tno01",
            tiles: [
              {
                tileInstanceId: "area_001:tile:0",
                areaId: "area_001",
                tilesetResRef: "tno01",
                row: 0,
                col: 0,
                tileIndex: 0,
                tileId: 101,
                modelResRef: "tno01_a01_01",
                modelSource: "set-tile-section",
                orientation: 1,
                height: 0.5,
                source: "are-tile-list"
              },
              {
                tileInstanceId: "area_001:tile:1",
                areaId: "area_001",
                tilesetResRef: "tno01",
                row: 0,
                col: 1,
                tileIndex: 1,
                tileId: 102,
                orientation: 2,
                source: "are-tile-list",
                fallbackReason: "tile-model-reference-missing"
              }
            ],
            auroraWorldTimer: {
              version: "aurora-worldtimer/v1",
              status: "ready",
              source: "module-ifo",
              sourceObjectKey: "modules/current/module.ifo",
              sourceHash: "a".repeat(64),
              fingerprint: "b".repeat(64),
              minutesPerHour: 2,
              startHour: 6,
              startTimeOfDayMs: 720000,
              dayLengthMs: 2880000,
              tickUnit: "milliseconds",
              advanceMode: "scene-animation-delta"
            },
            composition: {
              placeables: 1,
              doors: 1,
              creatures: 1,
              items: 0,
              sounds: 1,
              total: 4
            },
            updatedAt: "2026-05-27T10:00:00.000Z",
            sourceResources: {
              areSha256: "a".repeat(64),
              gitSha256: "b".repeat(64),
              gicSha256: "c".repeat(64),
              ifoSha256: "d".repeat(64),
            },
            objects: [
              {
                objectId: "obj_1",
                kind: "placeable",
                templateId: "plc_market_stall_001",
                tag: "VALELightNodeOrange03m",
                localizedName: "[W] Balustrada",
                description: "[Q]Pallet, Empty",
                placeableBasicIdentity: {
                  tag: { present: true, value: "VALELightNodeOrange03m" },
                  appearance: {
                    present: true,
                    nativeType: "dword",
                    value: 104,
                    table: {
                      resourceName: "placeables.2da",
                      sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
                      sourceLayer: "hak",
                      sha256: "a".repeat(64),
                      sizeBytes: 8192,
                      rowCount: 16500,
                      rowIndex: 104
                    }
                  }
                },
                placeableLocalizedStrings: {
                  locName: {
                    present: true,
                    strRef: 0xffff_ffff,
                    entries: [
                      { languageId: 0, textBytesBase64: "W1ddIEJhbHVzdHJhZGE=" },
                      { languageId: 0, textBytesBase64: "" }
                    ]
                  },
                  description: {
                    present: true,
                    strRef: 0,
                    entries: [{ languageId: 0xffff_ffff, textBytesBase64: "gP8=" }]
                  }
                },
                placeableMetadata: {
                  "script.onUsed": "s04_plcprobe",
                  useable: true
                },
                x: 1,
                y: 2,
                z: 0,
                bearing: 90,
                visualTransform: {
                  scale: 0.5,
                  scaleX: 0.25,
                  scaleY: 0.5,
                  scaleZ: 0.75,
                  offsetX: 0,
                  offsetY: 0,
                  offsetZ: 0,
                  pitch: 4.712389,
                  yaw: 1.570796,
                  roll: 0
                }
              },
              {
                objectId: "obj_door_1",
                kind: "door",
                templateId: "utd_city_gate_01",
                x: 2,
                y: 3,
                z: 0,
                bearing: 45
              },
              {
                objectId: "obj_cre_alligator_hatchling",
                kind: "creature",
                templateId: "cre_alligator_hatchl",
                resRef: "alligator_hatchl",
                tag: "alligator_hatchling",
                appearanceType: 6403,
                creatureMetadata: {
                  templateResRef: "alligator_hatchl",
                  tag: "alligator_hatchling",
                  appearanceId: 6403,
                  firstName: "Piskle aligatora",
                  plot: false,
                  strength: 12
                },
                x: 3,
                y: 4,
                z: 0,
                bearing: 180
              },
              {
                objectId: "obj_sound_1",
                sourceIndex: 0,
                kind: "sound",
                templateId: "sfx_forge_loop_heavy",
                x: 4,
                y: 5,
                z: 1,
                bearing: 0,
                soundIntervalVariation: {
                  intervalMilliseconds: 6000,
                  intervalVariationMilliseconds: 0,
                  pitchVariationHundredths: 0,
                  volumeVariationByte: 0,
                },
                soundVolume: { volumeByte: 108 },
                soundActive: { activeByte: 1 },
                soundPlayOrder: { randomByte: 0 },
                soundPlayStyle: {
                  loopingByte: 1, continuousByte: 0, priorityByte: 3,
                  positionalByte: 1, soundsCount: 1, intervalDword: 6000,
                  intervalVariationDword: 0,
                },
                soundPlayback: {
                  sounds: ["sfx_forge_loop"],
                  loopingByte: 1, continuousByte: 0, priorityByte: 3,
                  positionalByte: 1, intervalDword: 6000,
                  intervalVariationDword: 0,
                },
                soundProfile: {
                  sounds: ["sfx_forge_loop"],
                  loopingByte: 1, continuousByte: 0, priorityByte: 3,
                  positionalByte: 1, randomPositionByte: 0,
                  elevationFloat32: 1, maxDistanceFloat32: 16, minDistanceFloat32: 2,
                  randomRangeXFloat32: 0, randomRangeYFloat32: 0,
                  intervalDword: 6000, intervalVariationDword: 0,
                },
                soundSchedule: { hoursMask: 0x800001, timesByte: 0 },
                soundPositioning: {
                  mode: "specific",
                  elevation: 1,
                  maxVolumeDistance: 2,
                  cutoffDistance: 16,
                  randomRangeWestEast: 0,
                  randomRangeNorthSouth: 0,
                  preserve: {
                    timeWindow: "",
                    hourMask: "",
                    active: true,
                    whenToPlay: "always",
                    dayNight: "both",
                    playStyle: "loop",
                    playOrder: "sequential",
                    intervalMs: 6000,
                    intervalVariationMs: 0,
                    volume: 0.85,
                    volumeVariation: 0,
                    pitchVariation: 0,
                    priority: 1,
                    flags: {
                      active: true,
                      looping: true,
                      positional: true
                    },
                    extra: {
                      auroraSoundList: "sfx_forge_loop_heavy"
                    }
                  }
                }
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaById("token_abc", "area_001");

    expect(result.areaId).toBe("area_001");
    expect(result.comments).toBe(" exact area note\r\nline two ");
    expect(result.eventScripts).toEqual({
      onEnter: "area_enter",
      onExit: "",
      onHeartbeat: "area_heartbeat",
      onUserDefined: "area_user",
    });
    expect(result.basicIdentity).toEqual({
      name: " Exact Area One ",
      nameProfile: "simple_inline_ascii",
      nameEntries: [{ languageId: 0, text: " Exact Area One " }],
      tag: "AREA_ONE_TAG",
    });
    expect(result.advancedFlags).toEqual({
      terrainType: { interior: true, natural: false, subterranean: true },
      playerVsPlayer: 2,
      noRest: false,
      listenCheckModifier: -8,
      spotCheckModifier: 11,
      loadingScreenId: 0xffff,
    });
    expect(result.moduleStartLocation).toEqual({
      areaResRef: "area_001",
      x: Math.fround(1.25),
      y: Math.fround(2.5),
      z: Math.fround(3.75),
      directionX: Math.fround(0),
      directionY: Math.fround(1),
    });
    expect(result.moduleStartLocationTargets).toEqual(["area_001", "area_002"]);
    expect(result.sourceResources).toEqual({
      areSha256: "a".repeat(64),
      gitSha256: "b".repeat(64),
      gicSha256: "c".repeat(64),
      ifoSha256: "d".repeat(64),
    });
    expect(result.previewImageUrl).toBe("/assets/previews/areas/area_001.webp");
    expect(result.textureAtlas).toMatchObject({
      atlasId: "atlas_area_001",
      objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
      contentType: "image/webp"
    });
    expect(result.tileSet).toBe("tno01");
    expect(result.auroraWorldTimer).toMatchObject({
      version: "aurora-worldtimer/v1",
      minutesPerHour: 2,
      startHour: 6,
      startTimeOfDayMs: 720000,
      dayLengthMs: 2880000
    });
    expect(result.tiles).toEqual([
      {
        tileInstanceId: "area_001:tile:0",
        areaId: "area_001",
        tilesetResRef: "tno01",
        row: 0,
        col: 0,
        tileIndex: 0,
        tileId: 101,
        modelResRef: "tno01_a01_01",
        modelSource: "set-tile-section",
        orientation: 1,
        height: 0.5,
        source: "are-tile-list"
      },
      {
        tileInstanceId: "area_001:tile:1",
        areaId: "area_001",
        tilesetResRef: "tno01",
        row: 0,
        col: 1,
        tileIndex: 1,
        tileId: 102,
        orientation: 2,
        source: "are-tile-list",
        fallbackReason: "tile-model-reference-missing"
      }
    ]);
    expect(result.composition).toMatchObject({
      placeables: 1,
      doors: 1,
      creatures: 1,
      sounds: 1,
      total: 4
    });
    expect(result.objects).toHaveLength(4);
    expect(result.objects[0]?.kind).toBe("placeable");
    expect(result.objects[0]?.tag).toBe("VALELightNodeOrange03m");
    expect(result.objects[0]?.localizedName).toBe("[W] Balustrada");
    expect(result.objects[0]?.description).toBe("[Q]Pallet, Empty");
    expect(result.objects[0]?.placeableBasicIdentity).toEqual({
      tag: { present: true, value: "VALELightNodeOrange03m" },
      appearance: {
        present: true,
        nativeType: "dword",
        value: 104,
        table: {
          resourceName: "placeables.2da",
          sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
          sourceLayer: "hak",
          sha256: "a".repeat(64),
          sizeBytes: 8192,
          rowCount: 16500,
          rowIndex: 104
        }
      }
    });
    expect(result.objects[0]?.placeableLocalizedStrings).toEqual({
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, textBytesBase64: "W1ddIEJhbHVzdHJhZGE=" },
          { languageId: 0, textBytesBase64: "" }
        ]
      },
      description: {
        present: true,
        strRef: 0,
        entries: [{ languageId: 0xffff_ffff, textBytesBase64: "gP8=" }]
      }
    });
    expect(result.objects[0]?.placeableMetadata).toEqual({
      "script.onUsed": "s04_plcprobe",
      useable: true
    });
    expect(result.objects[0]?.visualTransform).toEqual({
      scale: 0.5,
      scaleX: 0.25,
      scaleY: 0.5,
      scaleZ: 0.75,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 4.712389,
      yaw: 1.570796,
      roll: 0
    });
    expect(result.objects[1]?.kind).toBe("door");
    expect(result.objects[2]).toMatchObject({
      objectId: "obj_cre_alligator_hatchling",
      kind: "creature",
      templateId: "cre_alligator_hatchl",
      resRef: "alligator_hatchl",
      tag: "alligator_hatchling",
      appearanceType: 6403,
      creatureMetadata: {
        templateResRef: "alligator_hatchl",
        tag: "alligator_hatchling",
        appearanceId: 6403,
        firstName: "Piskle aligatora",
        plot: false,
        strength: 12
      }
    });
    expect(result.objects[3]).toMatchObject({
      kind: "sound",
      sourceIndex: 0,
      soundIntervalVariation: {
        intervalMilliseconds: 6000,
        intervalVariationMilliseconds: 0,
        pitchVariationHundredths: 0,
        volumeVariationByte: 0,
      },
      soundVolume: { volumeByte: 108 },
      soundActive: { activeByte: 1 },
      soundPlayOrder: { randomByte: 0 },
      soundPlayStyle: {
        loopingByte: 1, continuousByte: 0, priorityByte: 3,
        positionalByte: 1, soundsCount: 1, intervalDword: 6000,
        intervalVariationDword: 0,
      },
      soundPlayback: {
        sounds: ["sfx_forge_loop"],
        loopingByte: 1, continuousByte: 0, priorityByte: 3,
        positionalByte: 1, intervalDword: 6000,
        intervalVariationDword: 0,
      },
      soundProfile: {
        sounds: ["sfx_forge_loop"],
        loopingByte: 1, continuousByte: 0, priorityByte: 3,
        positionalByte: 1, randomPositionByte: 0,
        elevationFloat32: 1, maxDistanceFloat32: 16, minDistanceFloat32: 2,
        randomRangeXFloat32: 0, randomRangeYFloat32: 0,
        intervalDword: 6000, intervalVariationDword: 0,
      },
      soundSchedule: { hoursMask: 0x800001, timesByte: 0 },
      soundPositioning: {
        mode: "specific",
        preserve: {
          playStyle: "loop",
          extra: {
            auroraSoundList: "sfx_forge_loop_heavy"
          }
        }
      }
    });
  });

  it.each([
    ["NUL-containing", "bad\0note"],
    ["over-budget", "x".repeat(4097)],
  ])("rejects %s Area Comments at the HTTP boundary", async (_label, comments) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_invalid_comments",
        name: "Invalid Comments",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        comments,
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: {
          atlasId: "atlas_invalid_comments",
          cacheKey: "atlas_invalid_comments:1x1",
          strategy: "blob-cache",
        },
        composition: {
          placeables: 0,
          doors: 0,
          creatures: 0,
          encounters: 0,
          items: 0,
          sounds: 0,
          stores: 0,
          triggers: 0,
          waypoints: 0,
          total: 0,
        },
        updatedAt: "2026-08-21T20:00:00.000Z",
        objects: [],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_invalid_comments")).rejects.toThrow();
  });

  it.each([
    ["non-ASCII Name", { name: "München" }],
    ["blank Name", { name: "   " }],
    ["unknown Name storage profile", { name: "Crypt 01", nameProfile: "tlk" }],
    ["over-budget Tag", { tag: "x".repeat(65) }],
    ["unknown member", { tag: "TAG", extra: true }],
    ["empty object", {}],
  ])("rejects %s Area basic identity at the HTTP boundary", async (_label, basicIdentity) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_invalid_identity",
        name: "Invalid Identity",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        basicIdentity,
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: {
          atlasId: "atlas_invalid_identity",
          cacheKey: "atlas_invalid_identity:1x1",
          strategy: "blob-cache",
        },
        composition: {
          placeables: 0,
          doors: 0,
          creatures: 0,
          encounters: 0,
          items: 0,
          sounds: 0,
          stores: 0,
          triggers: 0,
          waypoints: 0,
          total: 0,
        },
        updatedAt: "2026-08-22T08:00:00.000Z",
        objects: [],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );

    await expect(port.getAreaById("token", "area_invalid_identity")).rejects.toThrow();
  });

  it.each([
    ["unknown terrain member", {
      terrainType: { interior: true, natural: false, subterranean: true, extra: true },
    }],
    ["invalid PvP mode", { playerVsPlayer: 4 }],
    ["numeric NoRest", { noRest: 1 }],
    ["low Listen modifier", { listenCheckModifier: -100 }],
    ["high Spot modifier", { spotCheckModifier: 100 }],
    ["fractional modifier", { listenCheckModifier: 1.5 }],
    ["negative loading-screen Word", { loadingScreenId: -1 }],
    ["oversized loading-screen Word", { loadingScreenId: 0x1_0000 }],
    ["fractional loading-screen Word", { loadingScreenId: 1.5 }],
    ["unknown advanced member", { loadScreenId: 1 }],
    ["empty advanced object", {}],
  ])("rejects %s Area advanced flags at the HTTP boundary", async (_label, advancedFlags) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_invalid_advanced",
        name: "Invalid Advanced",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        advancedFlags,
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: {
          atlasId: "atlas_invalid_advanced",
          cacheKey: "atlas_invalid_advanced:1x1",
          strategy: "blob-cache",
        },
        composition: {
          placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
          sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 0,
        },
        updatedAt: "2026-08-22T08:00:00.000Z",
        objects: [],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    await expect(port.getAreaById("token", "area_invalid_advanced")).rejects.toThrow();
  });

  it.each([
    ["non-canonical Area ResRef", {
      areaResRef: "Area-01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
    }],
    ["non-binary32 coordinate", {
      areaResRef: "area_01", x: 0.1, y: 2, z: 3, directionX: 0, directionY: 1,
    }],
    ["missing direction member", {
      areaResRef: "area_01", x: 1, y: 2, z: 3, directionX: 0,
    }],
    ["unknown tuple member", {
      areaResRef: "area_01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
      bearing: 0,
    }],
  ])("rejects %s module Start Location at the HTTP boundary", async (
    _label,
    moduleStartLocation,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_invalid_start",
        name: "Invalid Start",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        moduleStartLocation,
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: {
          atlasId: "atlas_invalid_start",
          cacheKey: "atlas_invalid_start:1x1",
          strategy: "blob-cache",
        },
        composition: {
          placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
          sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 0,
        },
        updatedAt: "2026-08-22T08:00:00.000Z",
        objects: [],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    await expect(port.getAreaById("token", "area_invalid_start")).rejects.toThrow();
  });

  it.each([
    ["empty", []],
    ["unsorted", ["other_area", "area_01"]],
    ["duplicate", ["area_01", "area_01"]],
    ["non-canonical", ["Area_01"]],
  ])("rejects a %s module Start Location target catalog", async (
    _label,
    moduleStartLocationTargets,
  ) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        areaId: "area_invalid_start_targets",
        name: "Invalid Start Targets",
        biome: "interior",
        width: 1,
        height: 1,
        tags: [],
        moduleStartLocationTargets,
        benchmark: false,
        previewImageUrl: "",
        textureAtlas: {
          atlasId: "atlas_invalid_start_targets",
          cacheKey: "atlas_invalid_start_targets:1x1",
          strategy: "blob-cache",
        },
        composition: {
          placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
          sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 0,
        },
        updatedAt: "2026-08-24T20:00:00.000Z",
        objects: [],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    await expect(
      port.getAreaById("token", "area_invalid_start_targets"),
    ).rejects.toThrow();
  });

  it("processes an area and preserves backend cache and processed metadata", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "4f8c2a1b9e7d6c5a",
              hit: false,
              storedAt: "2026-06-16T18:20:00.000Z",
              hits: 0
            },
            area: {
              areaId: "area_001",
              name: "Area One",
              biome: "urban",
              width: 24,
              height: 24,
              tags: ["city"],
              benchmark: false,
              previewImageUrl: "/assets/previews/areas/area_001.webp",
              textureAtlas: {
                atlasId: "atlas_area_001",
                cacheKey: "atlas_area_001:24x24",
                strategy: "blob-cache",
                objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
                contentType: "image/webp",
                sizeBytes: 262144,
                etag: "atlas-area-001"
              },
              soundscape: {
                bindingKeys: {
                  areaKey: "GI_sound_area",
                  randomKey: "GI_sound_rndm",
                  positionalKey: "GI_sound_pos"
                },
                area: [],
                random: [],
                positional: []
              },
              composition: {
                placeables: 1,
                doors: 1,
                creatures: 1,
                items: 1,
                sounds: 1,
                total: 5
              },
              updatedAt: "2026-05-27T10:00:00.000Z",
              processedAt: "2026-06-16T18:20:00.000Z",
              objects: [
                {
                  objectId: "obj_sound_1",
                  kind: "sound",
                  templateId: "sfx_forge_loop_heavy",
                  x: 4,
                  y: 5,
                  z: 1,
                  bearing: 0,
                  soundPositioning: {
                    mode: "specific",
                    elevation: 1,
                    maxVolumeDistance: 2,
                    cutoffDistance: 16,
                    randomRangeWestEast: 0,
                    randomRangeNorthSouth: 0
                  }
                }
              ]
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.processArea("token_abc", "area_001", { bypassCache: true });

    expect(result.cache).toMatchObject({
      key: "4f8c2a1b9e7d6c5a",
      hit: false,
      hits: 0
    });
    expect(result.area).toMatchObject({
      areaId: "area_001",
      previewImageUrl: "/assets/previews/areas/area_001.webp",
      processedAt: "2026-06-16T18:20:00.000Z",
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 1,
        total: 5
      }
    });
    expect(result.area.objects[0]).toMatchObject({
      kind: "sound",
      soundPositioning: {
        mode: "specific",
        elevation: 1
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/process",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token_abc",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bypassCache: true })
      })
    );
  });

  it("fetches proxy texture atlas delivery contracts for a processed area cache", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cacheKey: "4f8c2a1b9e7d6c5a",
            textureAtlas: {
              mode: "proxy",
              atlasId: "atlas_area_001",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              etag: "atlas-area-001",
              proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaTextureAtlasContracts("token_abc", "4f8c2a1b9e7d6c5a");

    expect(result).toMatchObject({
      cacheKey: "4f8c2a1b9e7d6c5a",
      textureAtlas: {
        mode: "proxy",
        atlasId: "atlas_area_001",
        proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures/contracts?mode=proxy",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("fetches direct texture atlas delivery contracts when backend exposes direct delivery", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cacheKey: "4f8c2a1b9e7d6c5a",
            textureAtlas: {
              mode: "direct",
              atlasId: "atlas_area_001",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              directUrl: "https://assets.example.test/modules/current/areas/atlases/atlas_area_001.webp",
              s3Url: "s3://aurora-modules/modules/current/areas/atlases/atlas_area_001.webp"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaTextureAtlasContracts(
      "token_abc",
      "4f8c2a1b9e7d6c5a",
      "direct"
    );

    expect(result.textureAtlas).toMatchObject({
      mode: "direct",
      directUrl: "https://assets.example.test/modules/current/areas/atlases/atlas_area_001.webp",
      s3Url: "s3://aurora-modules/modules/current/areas/atlases/atlas_area_001.webp"
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures/contracts?mode=direct",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("surfaces backend texture delivery contract failures without fallback behavior", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "AREA_DIRECT_DELIVERY_UNAVAILABLE",
            message: "Direct area delivery is unavailable without blob storage settings."
          }
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(
      port.getAreaTextureAtlasContracts("token_abc", "4f8c2a1b9e7d6c5a", "direct")
    ).rejects.toMatchObject({
      status: 422,
      code: "AREA_DIRECT_DELIVERY_UNAVAILABLE"
    });
  });

  it("throws AreaApiRequestError with backend code on non-2xx response", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN_ROLE",
            message: "Forbidden for role."
          }
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.listAreas("token_bad")).rejects.toBeInstanceOf(AreaApiRequestError);
    await expect(port.listAreas("token_bad")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN_ROLE"
    });
  });
});

function areaDetailWithObject(object: Record<string, unknown>) {
  return {
    areaId: "area_creature_names",
    name: "Creature names",
    biome: "interior",
    width: 1,
    height: 1,
    tags: [],
    benchmark: false,
    previewImageUrl: "",
    textureAtlas: {
      atlasId: "atlas_creature_names",
      cacheKey: "atlas_creature_names:1x1",
      strategy: "blob-cache",
    },
    composition: {
      placeables: 0,
      doors: 0,
      creatures: 1,
      encounters: 0,
      items: 0,
      sounds: 0,
      stores: 0,
      triggers: 0,
      waypoints: 0,
      total: 1,
    },
    updatedAt: "2026-08-26T00:00:00.000Z",
    objects: [object],
  };
}

function areaWithDoorTransitionStorage(storage: unknown) {
  return {
    areaId: "area_door_transition",
    name: "Door Transition",
    biome: "interior",
    width: 1,
    height: 1,
    tags: [],
    benchmark: false,
    previewImageUrl: "",
    textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
    composition: { placeables: 0, doors: 1, creatures: 0, items: 0, sounds: 0, total: 1 },
    updatedAt: "2026-08-22T00:00:00.000Z",
    objects: [{
      objectId: "obj_door_0",
      kind: "door",
      templateId: "nw_door",
      tag: "DOOR",
      x: 4,
      y: 5,
      z: 0,
      bearing: 0,
      doorTransition: {
        linkedTarget: "DESTINATION_TAG",
        linkedModule: "",
        linkedTag: "",
        linkedWaypoint: "",
        loadScreen: "",
        flags: {},
        storage,
      },
    }],
  };
}

function areaWithBasicIdentity(basicIdentity: unknown) {
  return {
    areaId: "area_basic_identity",
    name: "Summary Name",
    biome: "interior",
    width: 1,
    height: 1,
    tags: [],
    basicIdentity,
    benchmark: false,
    previewImageUrl: "",
    textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
    composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
    updatedAt: "2026-08-25T00:00:00.000Z",
    objects: [],
  };
}
