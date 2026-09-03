import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useMemo } from "react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AREAS_MODE_SELECTED_SCENE_STORAGE_KEY,
  PLACEABLES_MODE_STATE_STORAGE_KEY,
  WorkspaceLayout as ProductionWorkspaceLayout
} from "../../../../src/modules/layout/components/WorkspaceLayout";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";
import { createBrowserSceneViewportPort } from "../../../../src/modules/scene/composition/createBrowserSceneViewportPort";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";
import { AreaApiRequestError } from "../../../../src/modules/areas/adapters/httpAreaApiPort";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";
import type { AreaLifecycleFacade } from "../../../../src/modules/areas/application/areaLifecycleFacade";
import type { AreaEditingFacade } from "../../../../src/modules/areas/application/areaEditingFacade";
import { buildAreaTileCatalogCertificationKey } from "../../../../src/modules/areas/application/areaTileCatalogFilter";
import type {
  AreaDraftDocument,
  ProductionAreaDraftPayload
} from "../../../../src/modules/areas/ports/areaLifecyclePort";
import type {
  AreaApiDetail,
  AreaApiListItem,
  AreaApiProcessResult
} from "../../../../src/modules/areas/contracts";
import type { PlaceableApiPort } from "../../../../src/modules/placeables/ports/placeableApiPort";
import type { CreatureApiPort } from "../../../../src/modules/creatures/ports/creatureApiPort";
import type { SoundApiPort } from "../../../../src/modules/sounds/ports/soundApiPort";
import type { SoundApiListItem } from "../../../../src/modules/sounds/contracts";
import {
  hydrateAuroraAreaEditingState,
  type AuroraAreaTilesetDefinition,
} from "../../../../src/modules/scene/domain/auroraAreaEditing";
import { applyAuroraAreaEditingStateToScene } from "../../../../src/modules/scene/domain/auroraAreaEditingSceneMapper";

type AreasRuntimeCaptureWindow = typeof window & {
  __AURORA_AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY__?: boolean;
};

const viewportWiringHarness = vi.hoisted(() => {
  return {
    viewportPropsSpy: vi.fn()
  };
});

vi.mock("../../../../src/modules/layout/components/WorkspaceCanvasViewport", () => ({
  WorkspaceCanvasViewport: (props: unknown) => {
    viewportWiringHarness.viewportPropsSpy(props);
    return <div data-testid="workspace-canvas-viewport-stub" />;
  }
}));

function canonicalAuroraVfxPayload() {
  return {
    version: "backend-vfx-payload/test",
    canonicalStatus: "canonical",
    backendCanonical: true,
    sourceKind: "effect_instance",
    previewMode: "none",
    sourceProfile: "nwn-ee",
    sourceTable: "visualeffects.2da",
    sourceRowId: 42,
    sourceLabel: "Impact VFX",
    sourceResRef: "vfx_impact",
    sourceRows: {
      diagnostics: [{ code: "VFX_SOURCE_ROW_FACT", severity: "info", message: "source" }]
    },
    effectInstance: {
      diagnostics: [{ code: "VFX_EFFECT_INSTANCE_READY", severity: "info", message: "effect" }]
    },
    phaseSchedule: {
      diagnostics: [{ code: "VFX_PHASE_READY", severity: "info", message: "schedule" }]
    },
    dependencyGraph: {
      diagnostics: [{ code: "VFX_DEPENDENCY_READY", severity: "info", message: "dependency" }]
    },
    runtimeState: {
      diagnostics: [{ code: "VFX_RUNTIME_READY", severity: "info", message: "runtime" }]
    },
    renderContract: {
      version: "aurora-vfx-runtime-render-contract/v1",
      diagnostics: [{ code: "VFX_RENDER_READY", severity: "info", message: "render" }]
    }
  };
}

function buildAreaListItemFixture(
  overrides: Partial<AreaApiListItem> = {}
): AreaApiListItem {
  const areaId = overrides.areaId ?? "area_alpha";
  return {
    areaId,
    name: overrides.name ?? "Area Alpha",
    biome: overrides.biome ?? "urban",
    width: overrides.width ?? 3,
    height: overrides.height ?? 3,
    tags: overrides.tags ?? [],
    benchmark: overrides.benchmark ?? false,
    previewImageUrl: overrides.previewImageUrl ?? `/preview/${areaId}.webp`,
    textureAtlasId: overrides.textureAtlasId ?? `atlas_${areaId}`,
    objectCounts: overrides.objectCounts ?? {
      placeables: 1,
      doors: 0,
      creatures: 0,
      items: 0,
      sounds: 0,
      total: 1
    },
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z"
  };
}

function buildAreaDetailFixture(
  overrides: Partial<AreaApiDetail> = {}
): AreaApiDetail {
  const areaId = overrides.areaId ?? "area_stub";
  return {
    areaId,
    name: overrides.name ?? "Area Stub",
    biome: overrides.biome ?? "urban",
    width: overrides.width ?? 2,
    height: overrides.height ?? 2,
    tags: overrides.tags ?? [],
    benchmark: overrides.benchmark ?? false,
    previewImageUrl: overrides.previewImageUrl ?? `/preview/${areaId}.webp`,
    textureAtlas: overrides.textureAtlas ?? {
      atlasId: `atlas_${areaId}`,
      cacheKey: `atlas_${areaId}:${overrides.width ?? 2}x${overrides.height ?? 2}`,
      strategy: "blob-cache",
      objectKey: `modules/current/areas/atlases/atlas_${areaId}.webp`,
      contentType: "image/webp",
      sizeBytes: 4096
    },
    composition: overrides.composition ?? {
      placeables: 0,
      doors: 0,
      creatures: 0,
      items: 0,
      sounds: 0,
      total: 0
    },
    tiles: overrides.tiles ?? [],
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    objects: overrides.objects ?? []
  };
}

function buildAreaProcessResult(
  detail: AreaApiDetail,
  cacheKey = `cache_${detail.areaId}`
): AreaApiProcessResult {
  return {
    cache: {
      key: cacheKey,
      hit: false,
      storedAt: "2026-01-01T00:00:00.000Z",
      hits: 0
    },
    area: {
      ...detail,
      processedAt: "2026-01-01T00:00:00.000Z"
    }
  };
}

function attachProcessAreaFromDetail(areaApiPort: AreaApiPort): AreaApiPort {
  areaApiPort.processArea = vi.fn(async (accessToken, areaId) =>
    buildAreaProcessResult(await areaApiPort.getAreaById(accessToken, areaId))
  );
  return areaApiPort;
}

type WorkspaceAreaDraft = AreaDraftDocument<ProductionAreaDraftPayload<AreaApiDetail>>;

function buildCopyOnOpenFacade(
  areaApiPort: AreaApiPort,
  backendAccessToken: string | null
): AreaLifecycleFacade<WorkspaceAreaDraft> {
  return {
    queries: {
      listLocalDrafts: vi.fn(async () => ({
        ok: true as const,
        value: { items: [], nextCursor: null },
        metadata: { contractVersion: "1.1.0", requestId: "request_draft_list" }
      })),
      openLocalDraft: vi.fn()
    },
    commands: {
      openProductionAreaAsDraft: vi.fn(async (command) => {
        const processed = await areaApiPort.processArea(
          backendAccessToken ?? "",
          command.areaId,
          { bypassCache: false }
        );
        const sourceArea = processed.area;
        return {
          ok: true as const,
          value: {
            draftId: `draft_${command.areaId}`,
            title: command.draftTitle,
            revision: 1,
            updatedAt: sourceArea.updatedAt,
            draft: {
              schemaVersion: "area-draft.v1" as const,
              title: command.draftTitle,
              source: { type: "production_area" as const, areaId: command.areaId },
              payload: {
                schemaVersion: "production-area-draft-payload.v1" as const,
                sourceArea,
                provenance: {
                  areaId: command.areaId,
                  sourceUpdatedAt: sourceArea.updatedAt,
                  processingCacheKey: processed.cache.key,
                  sourceAreSha256: sourceArea.sourceResources?.areSha256,
                  sourceGitSha256: sourceArea.sourceResources?.gitSha256,
                  sourceGicSha256: sourceArea.sourceResources?.gicSha256
                }
              }
            }
          },
          metadata: {
            contractVersion: "1.1.0",
            requestId: `request_${command.areaId}`,
            revision: 1,
            idempotencyStatus: "created" as const,
            artifactIds: []
          }
        };
      }),
      saveLocalDraft: vi.fn(),
      deleteLocalDraft: vi.fn(),
      materializeArea: vi.fn()
    }
  } as unknown as AreaLifecycleFacade<WorkspaceAreaDraft>;
}

function WorkspaceLayout(props: ComponentProps<typeof ProductionWorkspaceLayout>) {
  const defaultAreaLifecycleFacade = useMemo(
    () => buildCopyOnOpenFacade(props.areaApiPort, props.backendAccessToken),
    [props.areaApiPort, props.backendAccessToken]
  );
  return (
    <ProductionWorkspaceLayout
      {...props}
      areaLifecycleFacade={props.areaLifecycleFacade ?? defaultAreaLifecycleFacade}
    />
  );
}

describe("WorkspaceLayout viewport wiring", () => {
  const areaApiPortStub: AreaApiPort = {
    login: vi.fn(async () => ({ accessToken: "token" })),
    listAreas: vi.fn(async () => ({ items: [], total: 0, limit: 100, offset: 0 })),
    getAreaById: vi.fn(async () => buildAreaDetailFixture({
      areaId: "area_stub",
      name: "Area Stub",
      biome: "urban",
      width: 2,
      height: 2,
      tags: [],
      benchmark: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
      objects: []
    })),
    processArea: vi.fn(async () => ({
      cache: {
        key: "area_stub_cache",
        hit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0
      },
      area: {
        ...buildAreaDetailFixture({
          areaId: "area_stub",
          name: "Area Stub"
        }),
        processedAt: "2026-01-01T00:00:00.000Z"
      }
    })),
    getAreaTextureAtlasContracts: vi.fn(async () => ({
      cacheKey: "area_stub_cache",
      textureAtlas: {
        mode: "proxy",
        atlasId: "atlas_area_stub",
        objectKey: "modules/current/areas/atlases/atlas_area_stub.webp",
        contentType: "image/webp",
        sizeBytes: 4096,
        proxyPath: "/api/v1/areas/cache/area_stub_cache/textures",
        proxyUrl: "/api/v1/areas/cache/area_stub_cache/textures"
      }
    }))
  };
  const placeableApiPortStub: PlaceableApiPort = {
    listPlaceables: vi.fn(async () => ({
      items: [
        {
          templateId: "plc_barrel_01",
          resref: "plc_a01",
          name: "PLC_BARREL_01",
          category: "placeables",
          placeableSubtype: "generic",
          tags: ["barrel"],
          previewImageUrl: "/preview/plc_barrel_01.png"
        },
        {
          templateId: "plc_table_02",
          resref: "plc_a02",
          name: "PLC_TABLE_02",
          category: "placeables",
          placeableSubtype: "generic",
          tags: ["table"],
          previewImageUrl: "/preview/plc_table_02.png"
        },
        {
          templateId: "plc_chair_03",
          resref: "plc_x02",
          name: "PLC_CHAIR_03",
          category: "placeables",
          placeableSubtype: "generic",
          tags: ["chair"],
          previewImageUrl: "/preview/plc_chair_03.png"
        },
        {
          templateId: "plc_crate_04",
          resref: "plc_a03",
          name: "PLC_CRATE_04",
          category: "placeables",
          placeableSubtype: "generic",
          tags: ["crate"],
          previewImageUrl: "/preview/plc_crate_04.png"
        }
      ],
      total: 4,
      limit: 100,
      offset: 0
    })),
    getPlaceablePreview: vi.fn(async (accessToken, templateId) => ({
      templateId,
      resref: templateId.replace("plc_", "plc_"),
      name: templateId.toUpperCase(),
      category: "placeables",
      previewImageUrl: `/preview/${templateId}.png`,
      metadata: {}
    })),
    processPlaceable: vi.fn(async () => ({
      cacheKey: "cache_key",
      cacheHit: false,
      storedAt: "2026-01-01T00:00:00.000Z",
      hits: 0,
      placeable: {
        templateId: "plc_barrel_01",
        resref: "plc_a01",
        name: "PLC_BARREL_01",
        category: "placeables",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "default",
          isDoor: false,
          isVfx: false
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-01-01T00:00:00.000Z",
          assetCount: 0,
          candidatesScanned: 0,
          assets: []
        }
      }
    })),
    getPlaceableAssetContracts: vi.fn(async () => ({
      cacheKey: "cache_key",
      assets: []
    }))
  };
  const soundListItem: SoundApiListItem = {
    soundId: "sound_ambient_city_market_001",
    resref: "amb_city_market_day",
    name: "City Market Day",
    category: "ambient",
    format: "ogg",
    tags: ["city", "market"],
    benchmark: true,
    previewWaveformUrl: "/assets/previews/sounds/city-market-day.webp",
    spatialMode: "2d",
    playbackMode: "looping",
    source: {
      layer: "module"
    },
    auroraUsage: {
      bindingKey: "GI_sound_area",
      sourceField: "AmbientSoundDay",
      defaultsTable: "sounddefaultstim"
    },
    metrics: {
      durationMs: 2400,
      cues: 1,
      emitters: 0
    },
    updatedAt: "2026-06-16T10:00:00.000Z"
  };
  const soundApiPortStub: SoundApiPort = {
    listSounds: vi.fn(async () => ({
      items: [soundListItem],
      total: 1,
      limit: 100,
      offset: 0
    })),
    processSound: vi.fn(async () => ({
      cacheKey: "cache_sound_abc",
      cacheHit: false,
      storedAt: "2026-06-16T10:00:00.000Z",
      hits: 0,
      sound: {
        ...soundListItem,
        audio: {
          assetId: "asset_sound_001",
          cacheKey: "audio/ambient/amb_city_market_day:sound_ambient_city_market_001",
          strategy: "blob-cache",
        objectKey: "modules/current/audio/ambient/amb_city_market_day.ogg",
        contentType: "audio/ogg",
        sizeBytes: 512,
        etag: "source-audio-etag-001",
        format: "ogg",
        sampleRateHz: 44100,
          channels: 2
        },
        spatial: {
          mode: "2d",
          loop: true
        },
        playback: {
          mode: "looping",
          ambientOnly: true
        },
        render: {
          backendType: "sound",
          frontendType: "sound",
          playbackPreset: "ambient-loop"
        },
        processedAt: "2026-06-16T10:00:01.000Z"
      }
    })),
    getSoundAudioContracts: vi.fn(async () => ({
      cacheKey: "cache_sound_abc",
      audio: {
        mode: "proxy",
        assetId: "asset_sound_001",
        objectKey: "modules/current/audio/ambient/amb_city_market_day.ogg",
        contentType: "audio/ogg",
        sizeBytes: 512,
        etag: "source-audio-etag-001",
        proxyPath: "/api/v1/catalog/sounds/cache/cache_sound_abc/audio",
        proxyUrl: "/api/v1/catalog/sounds/cache/cache_sound_abc/audio"
      }
    })),
    getSoundAudioBlob: vi.fn(async () => new Blob(["audio"], { type: "audio/ogg" }))
  };

  function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    });
    return { promise, resolve, reject };
  }

  function activateFocusedButtonFromKeyboard(button: HTMLElement, key: "Enter" | " ") {
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.keyDown(button, {
      key,
      code: key === "Enter" ? "Enter" : "Space"
    });
    fireEvent.keyUp(button, {
      key,
      code: key === "Enter" ? "Enter" : "Space"
    });
    fireEvent.click(button, { detail: 0 });
  }

  type SoundAudioTestDouble = {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    removeAttribute: ReturnType<typeof vi.fn>;
    loop: boolean;
    duration?: number;
    onended: null | (() => void);
    onerror: null | (() => void);
  };
  type SoundWebAudioSourceTestDouble = {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    loop: boolean;
    buffer: unknown;
    onended: null | (() => void);
  };

  function installSoundPlaybackTestDoubles(options: {
    objectUrl?: string;
    play?: SoundAudioTestDouble["play"];
    previewDurationSeconds?: number;
    webAudio?: {
      durationSeconds?: number;
      start?: ReturnType<typeof vi.fn>;
    };
  } = {}) {
    const originalAudio = globalThis.Audio;
    const originalAudioContext = globalThis.AudioContext;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const audio: SoundAudioTestDouble = {
      play: options.play ?? vi.fn(async () => undefined),
      pause: vi.fn(),
      load: vi.fn(),
      removeAttribute: vi.fn(),
      loop: false,
      duration: options.previewDurationSeconds,
      onended: null,
      onerror: null
    };
    const webAudioSources: SoundWebAudioSourceTestDouble[] = [];
    const webAudioStart = options.webAudio?.start ?? vi.fn();
    const webAudioContext =
      options.webAudio !== undefined
        ? {
            state: "running",
            sampleRate: 8000,
            destination: {},
            resume: vi.fn(async () => undefined),
            close: vi.fn(async () => undefined),
            createBuffer: vi.fn(() => ({ duration: 0 })),
            createBufferSource: vi.fn(() => {
              const source: SoundWebAudioSourceTestDouble = {
                start: webAudioStart,
                stop: vi.fn(),
                connect: vi.fn(),
                disconnect: vi.fn(),
                loop: false,
                buffer: null,
                onended: null
              };
              webAudioSources.push(source);
              return source as unknown as AudioBufferSourceNode;
            }),
            decodeAudioData: vi.fn(async () => ({
              duration: options.webAudio?.durationSeconds ?? 1
            }))
          }
        : null;

    globalThis.Audio = vi.fn(() => audio) as unknown as typeof Audio;
    if (webAudioContext) {
      globalThis.AudioContext = vi.fn(
        () => webAudioContext as unknown as AudioContext
      ) as unknown as typeof AudioContext;
    } else if (options.previewDurationSeconds !== undefined) {
      globalThis.AudioContext = vi.fn(
        () =>
          ({
            decodeAudioData: vi.fn(async () => ({ duration: options.previewDurationSeconds })),
            close: vi.fn(async () => undefined)
          }) as unknown as AudioContext
      ) as unknown as typeof AudioContext;
    }
    URL.createObjectURL = vi.fn(() => options.objectUrl ?? "blob:sound-preview");
    URL.revokeObjectURL = vi.fn();

    return {
      audio,
      webAudioContext,
      webAudioSources,
      restore: () => {
        globalThis.Audio = originalAudio;
        globalThis.AudioContext = originalAudioContext;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
      }
    };
  }

  function expectSoundAudioCleanup(
    audio: Pick<SoundAudioTestDouble, "pause" | "removeAttribute" | "load"> | undefined,
    options: {
      releaseCalls?: number;
      revokedUrl?: string;
      revokedCallCount?: number;
    } = {}
  ) {
    const releaseCalls = options.releaseCalls ?? 1;
    expect(audio?.pause).toHaveBeenCalledTimes(releaseCalls);
    expect(audio?.removeAttribute).toHaveBeenCalledWith("src");
    expect(audio?.removeAttribute).toHaveBeenCalledTimes(releaseCalls);
    expect(audio?.load).toHaveBeenCalledTimes(releaseCalls);
    if (options.revokedUrl) {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(options.revokedUrl);
    }
    if (options.revokedCallCount !== undefined) {
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(options.revokedCallCount);
    }
  }

  function expectStatusRegionText(pattern: RegExp) {
    expect(
      screen
        .getAllByRole("status")
        .some((status) => pattern.test(status.textContent ?? ""))
    ).toBe(true);
  }

  function renderSoundsModeWorkspace(options: {
    soundApiPort?: SoundApiPort;
    trackTelemetryEvent?: ReturnType<typeof vi.fn>;
  } = {}) {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const trackTelemetryEvent = options.trackTelemetryEvent ?? vi.fn();
    const view = render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        soundApiPort={options.soundApiPort ?? soundApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        activeBuilderModeId="sounds_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    return {
      ...view,
      workspaceChromeFacade,
      sceneViewportPort,
      sceneObjectCatalogQueryFacade,
      toolbarState,
      trackTelemetryEvent
    };
  }

  beforeEach(() => {
    viewportWiringHarness.viewportPropsSpy.mockClear();
    vi.clearAllMocks();
    delete (window as AreasRuntimeCaptureWindow)
      .__AURORA_AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY__;
    window.history.replaceState({}, "", "/");
    window.sessionStorage.removeItem(AREAS_MODE_SELECTED_SCENE_STORAGE_KEY);
    window.localStorage.removeItem(PLACEABLES_MODE_STATE_STORAGE_KEY);
  });

  it("loads one exact active-tileset certification source and wires it to panel and viewport", async () => {
    const definition: AuroraAreaTilesetDefinition = {
      tilesetResRef: "testset",
      fingerprint: "a".repeat(64),
      defaultTerrain: "grass",
      transitionRules: [],
      tiles: [{
        tileId: 0,
        terrain: {
          topLeft: "grass",
          topRight: "grass",
          bottomRight: "grass",
          bottomLeft: "grass",
        },
        crossers: {},
        cornerHeights: {
          topLeft: 0,
          topRight: 0,
          bottomRight: 0,
          bottomLeft: 0,
        },
      }],
      groups: [],
    };
    const state = hydrateAuroraAreaEditingState({
      areaResRef: "area_certification_wiring",
      width: 2,
      height: 2,
      definition,
      tiles: [
        { id: "tile_0_0", row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
        { id: "tile_0_1", row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
        { id: "tile_1_0", row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
        { id: "tile_1_1", row: 1, col: 1, tileId: 0, orientation: 0, height: 0 },
      ],
    });
    if (!state.ok) throw new Error(state.message);
    const scene = applyAuroraAreaEditingStateToScene(
      {
        sceneId: "area_certification_wiring",
        areaName: "Certification Wiring",
        biome: "test",
        width: 2,
        height: 2,
        tiles: [],
        objects: [],
        updatedAtUnixMs: 1,
        source: "aurora_area",
      },
      state.state,
      definition,
      "grass",
    );
    window.sessionStorage.setItem(
      AREAS_MODE_SELECTED_SCENE_STORAGE_KEY,
      JSON.stringify(scene),
    );
    const index = new Map([[
      buildAreaTileCatalogCertificationKey("testset", 0),
      {
        rowId: "tile:testset:0",
        eligibility: { status: "eligible" as const },
        proofs: {
          inventory: "verified" as const,
          assetClosure: "verified" as const,
          render: "verified" as const,
          visualSeam: "missing" as const,
          setAdjacency: "missing" as const,
          pathReference: "missing" as const,
          pathConnect: "missing" as const,
          wokSeam: "missing" as const,
          persistence: "missing" as const,
          toolset: "missing" as const,
          nwnRuntime: "missing" as const,
        },
      },
    ]]);
    const getTileCertificationIndex = vi.fn().mockResolvedValue(index);
    const areaEditingFacade = {
      queries: {
        listTilesets: vi.fn(),
        getTilesetDefinition: vi.fn(),
        getDefinitionForArea: vi.fn(),
        getTileCertificationIndex,
        verify: vi.fn(),
      },
      commands: { exportAndDownloadAre: vi.fn() },
    } as unknown as AreaEditingFacade;
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const trackTelemetryEvent = vi.fn();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={createBrowserSceneViewportPort()}
        areaApiPort={areaApiPortStub}
        areaEditingFacade={areaEditingFacade}
        backendAccessToken="token"
        sceneObjectCatalogQueryFacade={createSceneObjectCatalogQueryFacade()}
        trackTelemetryEvent={trackTelemetryEvent}
        toolbarState={workspaceChromeFacade.createDefaultToolbarState()}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />,
    );

    await waitFor(() => expect(getTileCertificationIndex).toHaveBeenCalledWith(
      "token",
      "testset",
    ));
    await waitFor(() => {
      const props = viewportWiringHarness.viewportPropsSpy.mock.lastCall?.[0] as {
        tileProductionCertification?: {
          status: string;
          tilesetResRef: string;
          index?: ReadonlyMap<string, unknown>;
        };
      };
      expect(props.tileProductionCertification).toEqual({
        status: "ready",
        tilesetResRef: "testset",
        index,
      });
    });
    expect(screen.getByRole("status", { name: "Area tile production admission" }))
      .toHaveAttribute("data-area-tile-production-admission-status", "ready");
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "scene.area_tiles.certification_index.load_ready",
      expect.objectContaining({ tilesetResRef: "testset", rowCount: 1 }),
    );
  });

  it("adds backend creature templates to the Areas add-object palette", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const creatureApiPort: CreatureApiPort = {
      listCreatures: vi.fn(async () => ({
        items: [
          {
            templateId: "cre_guard_captain",
            resref: "cre_guard",
            name: "Guard Captain",
            category: "npc",
            tags: ["guard"],
            previewImageUrl: "/preview/cre_guard_captain.png",
            metadata: {
              tag: "guard_captain",
              firstName: "Guard",
              lastName: "Captain",
              strength: 16,
              dexterity: 13,
              constitution: 14,
              intelligence: 10,
              wisdom: 12,
              charisma: 8,
              plot: true
            }
          }
        ],
        total: 1,
        limit: 1000,
        offset: 0
      })),
      processCreature: vi.fn(async () => ({
        cache: {
          key: "cre_guard_captain:v1",
          hit: false,
          storedAt: "2026-01-01T00:00:00.000Z",
          hits: 0
        },
        creature: {
          templateId: "cre_guard_captain",
          kind: "creature",
          resref: "cre_guard",
          name: "Guard Captain",
          category: "npc",
          benchmarkCandidate: false,
          render: {
            backendType: "creature",
            frontendType: "creature",
            rendererPreset: "creature-standard"
          },
          processedAt: "2026-01-01T00:00:00.000Z"
        }
      })),
      getProcessedCreature: vi.fn()
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        creatureApiPort={creatureApiPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(creatureApiPort.listCreatures).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: /add objects/i }));
    await waitFor(() => {
      expect(creatureApiPort.listCreatures).toHaveBeenCalledWith("token", {
        limit: 1000,
        offset: 0
      });
    });
    const addObjectsSection = await screen.findByRole("article", {
      name: /add objects section/i
    });
    const familyRail = within(addObjectsSection).getByRole("tablist", {
      name: /object family palette/i
    });
    fireEvent.click(within(familyRail).getByRole("tab", { name: /creatures family/i }));

    expect(await within(addObjectsSection).findByText("GUARD_CAPTAIN")).toBeInTheDocument();
    expect(within(addObjectsSection).getByText("cre_guard")).toBeInTheDocument();
  });

  it("passes Area scene persistence ports down and refreshes the draft list after save", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const listLocalDrafts = vi.fn().mockResolvedValue({
      ok: true,
      value: { items: [], nextCursor: null },
      metadata: { contractVersion: "1.1.0", requestId: "request-drafts" }
    });
    const areaLifecycleFacade = {
      queries: {
        listLocalDrafts,
        openLocalDraft: vi.fn()
      },
      commands: {
        saveLocalDraft: vi.fn(),
        deleteLocalDraft: vi.fn(),
        materializeArea: vi.fn()
      }
    } as unknown as AreaLifecycleFacade;

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaLifecycleFacade={areaLifecycleFacade}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(screen.getByTestId("workspace-canvas-viewport-stub")).toBeInTheDocument();
    expect(viewportWiringHarness.viewportPropsSpy).toHaveBeenCalled();

    const firstViewportProps = viewportWiringHarness.viewportPropsSpy.mock.calls[0]?.[0] as {
      sceneViewportPort: unknown;
      areaLifecycleFacade: unknown;
      placeableApiPort: unknown;
      placeableAssetAccessToken: unknown;
      onAreaDraftPersisted?: () => void;
    };
    expect(firstViewportProps.sceneViewportPort).toBe(sceneViewportPort);
    expect(firstViewportProps.areaLifecycleFacade).toBe(areaLifecycleFacade);
    expect(firstViewportProps.placeableApiPort).toBe(placeableApiPortStub);
    expect(firstViewportProps.placeableAssetAccessToken).toBe("token");
    expect(firstViewportProps.onAreaDraftPersisted).toEqual(expect.any(Function));

    await waitFor(() => {
      expect(listLocalDrafts).toHaveBeenCalledTimes(1);
    });
    act(() => {
      firstViewportProps.onAreaDraftPersisted?.();
    });
    await waitFor(() => {
      expect(listLocalDrafts).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps the Area tile selection callback stable and idempotent", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="viewer"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    type SelectionProps = {
      onSelectedTileChange: (tileId: string | null, tileIds: string[]) => void;
    };
    const firstProps = viewportWiringHarness.viewportPropsSpy.mock.lastCall?.[0] as SelectionProps;
    const firstCallback = firstProps.onSelectedTileChange;
    const renderCount = viewportWiringHarness.viewportPropsSpy.mock.calls.length;

    act(() => firstCallback("tile-0-0", ["tile-0-0"]));
    await waitFor(() => {
      expect(viewportWiringHarness.viewportPropsSpy.mock.calls.length).toBeGreaterThan(renderCount);
    });

    const secondProps = viewportWiringHarness.viewportPropsSpy.mock.lastCall?.[0] as SelectionProps;
    expect(secondProps.onSelectedTileChange).toBe(firstCallback);
    act(() => secondProps.onSelectedTileChange("tile-0-0", ["tile-0-0"]));
    expect(viewportWiringHarness.viewportPropsSpy.mock.lastCall?.[0]).toBe(secondProps);
  });

  it("expands the viewport over both side panels in fullscreen focus mode", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const onExitViewportFullscreen = vi.fn();

    render(
      <WorkspaceLayout
        role="viewer"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        viewportFullscreen={true}
        onExitViewportFullscreen={onExitViewportFullscreen}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const layout = screen.getByLabelText("workspace layout");
    expect(layout).toHaveClass("is-viewport-fullscreen");
    expect(layout).toHaveAttribute("data-viewport-fullscreen", "true");

    const viewportProps = viewportWiringHarness.viewportPropsSpy.mock.calls[0]?.[0] as {
      leftPanelWidthPx: number;
      rightPanelWidthPx: number;
    };
    expect(viewportProps.leftPanelWidthPx).toBe(0);
    expect(viewportProps.rightPanelWidthPx).toBe(0);

    fireEvent.click(
      screen.getByRole("button", { name: /exit viewport fullscreen/i })
    );
    expect(onExitViewportFullscreen).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onExitViewportFullscreen).toHaveBeenCalledTimes(2);
  });

  it("separates area selection from add-placeables workflow in the builder left panel", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const trackTelemetryEvent = vi.fn();
    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(screen.getByRole("heading", { name: "Workspace Mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /areas mode/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const workflow = screen.getByRole("group", { name: /areas mode workflow/i });
    expect(workflow).toHaveClass("areas-mode-panel");
    expect(within(workflow).getByLabelText("Opened area status")).toHaveTextContent(
      "No area opened"
    );
    const workflowTabs = within(workflow).getByRole("tablist", {
      name: /areas workflow steps/i
    });
    const selectAreaTab = within(workflowTabs).getByRole("tab", { name: /select area/i });
    const addObjectsTab = within(workflowTabs).getByRole("tab", { name: /add objects/i });
    expect(selectAreaTab).toHaveAttribute("aria-selected", "true");
    expect(addObjectsTab).toHaveAttribute("aria-selected", "false");

    const areaSection = within(workflow).getByRole("article", {
      name: /area selection section/i
    });
    expect(within(areaSection).getByRole("heading", { name: "Areas" })).toBeInTheDocument();
    expect(
      within(areaSection).getByRole("button", { name: /open selected area/i })
    ).toBeInTheDocument();
    expect(
      within(areaSection).getByRole("searchbox", { name: /filter areas/i })
    ).toBeInTheDocument();
    expect(within(workflow).queryByRole("article", {
      name: /add objects section/i
    })).not.toBeInTheDocument();

    fireEvent.click(addObjectsTab);

    expect(addObjectsTab).toHaveAttribute("aria-selected", "true");
    expect(selectAreaTab).toHaveAttribute("aria-selected", "false");
    expect(within(workflow).queryByRole("article", {
      name: /area selection section/i
    })).not.toBeInTheDocument();
    const addObjectsSection = within(workflow).getByRole("article", {
      name: /add objects section/i
    });
    expect(
      within(addObjectsSection).getByRole("heading", { name: "Add Objects" })
    ).toBeInTheDocument();
    expect(
      within(addObjectsSection).getByRole("combobox", {
        name: /add object type selector/i
      })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement).toBe(
        within(addObjectsSection).getByRole("searchbox", { name: /filter objects/i })
      );
    });
    expect(trackTelemetryEvent).toHaveBeenCalledWith("ui.workspace.areas.workflow_step_changed", {
      userId: "u_builder_001",
      step: "placeables",
      source: "tab"
    });
    expect(workflow).toContainElement(addObjectsSection);
    await waitFor(() => {
      expect(screen.queryByText("Loading areas...")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Tile Catalog" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Paint Tools" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Asset Browser" })).not.toBeInTheDocument();
  });

  it("defers the Areas Mode sound catalog until the Sounds family is selected", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        soundApiPort={soundApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /add objects/i }));

    const addObjectsSection = await screen.findByRole("article", {
      name: /add objects section/i
    });
    await waitFor(() => {
      expect(placeableApiPortStub.listPlaceables).toHaveBeenCalledWith("token", {
        limit: 1000,
        offset: 0
      });
    });
    expect(
      within(addObjectsSection).getByRole("button", { name: /plc_barrel_01/i })
    ).toBeInTheDocument();
    expect(soundApiPortStub.listSounds).not.toHaveBeenCalled();

    const selector = within(addObjectsSection).getByRole("combobox", {
      name: /add object type selector/i
    });
    fireEvent.change(selector, { target: { value: "sounds" } });

    const soundsList = await within(addObjectsSection).findByRole("list", {
      name: /sounds add list/i
    });
    expect(within(soundsList).getByRole("button", { name: /sound_amb_city_market_day/i }))
      .toBeInTheDocument();
    expect(within(soundsList).getByText("amb_city_market_day")).toBeInTheDocument();
    expect(soundApiPortStub.listSounds).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ limit: 100, offset: 0 })
    );
  });

  it("renders area list preview images and texture atlas ids from backend list metadata", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithPreviewMetadata: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_preview_ready",
            name: "Area Preview Ready",
            previewImageUrl: "/assets/previews/areas/area_preview_ready.webp",
            textureAtlasId: "atlas_area_preview_ready"
          }),
          buildAreaListItemFixture({
            areaId: "area_preview_missing",
            name: "Area Preview Missing",
            previewImageUrl: "",
            textureAtlasId: "atlas_area_preview_missing"
          })
        ],
        total: 2,
        limit: 100,
        offset: 0
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithPreviewMetadata}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const previewImage = await screen.findByRole("img", {
      name: "Area Preview Ready preview"
    });
    expect(previewImage).toHaveAttribute(
      "src",
      "/assets/previews/areas/area_preview_ready.webp"
    );
    const previewFrame = previewImage.closest(".scene-object-thumbnail");
    expect(previewFrame).not.toBeNull();
    fireEvent.mouseEnter(previewFrame as HTMLElement);
    const expandedPreview = document.querySelector(".thumbnail-hover-preview img");
    expect(expandedPreview).toHaveAttribute(
      "src",
      "/assets/previews/areas/area_preview_ready.webp"
    );
    fireEvent.mouseLeave(previewFrame as HTMLElement);
    expect(document.querySelector(".thumbnail-hover-preview")).not.toBeInTheDocument();
    fireEvent.error(previewImage);
    await waitFor(() => {
      expect(previewImage.getAttribute("src") ?? "").toContain("data:image/svg+xml");
    });
    expect(screen.getByText("Atlas atlas_area_preview_ready")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Area Preview Missing preview unavailable" })
    ).toBeInTheDocument();
    expect(screen.getByText("Atlas atlas_area_preview_missing")).toBeInTheDocument();
    const areaSection = screen.getByLabelText("area selection section");
    const areaList = within(areaSection).getByRole("list", { name: /area list/i });
    const areaActions = within(areaSection).getByLabelText("area diagnostics actions");
    expect(
      areaList.compareDocumentPosition(areaActions) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    const areaFilter = within(areaSection).getByRole("searchbox", { name: /filter areas/i });
    fireEvent.change(areaFilter, { target: { value: "Area Preview Ready" } });
    expect(within(areaSection).getByText("1/2")).toBeInTheDocument();
    expect(
      within(areaSection).queryByRole("button", { name: /area preview missing/i })
    ).not.toBeInTheDocument();

    fireEvent.change(areaFilter, { target: { value: "not in this module" } });
    expect(within(areaSection).getByText("0/2")).toBeInTheDocument();
    expect(
      within(areaSection).getByText("No areas match the current filter.")
    ).toBeInTheDocument();
    expect(areaPortWithPreviewMetadata.listAreas).toHaveBeenCalledWith("token", {
      limit: 100,
      offset: 0
    });
  });

  it("opens an area actions context menu from a right-clicked area row", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const trackTelemetryEvent = vi.fn();
    const processArea = vi.fn(async (_accessToken: string, areaId: string) => ({
      cache: {
        key: `cache_${areaId}`,
        hit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0
      },
      area: {
        ...buildAreaDetailFixture({
          areaId,
          name: areaId === "area_beta" ? "Area Row Beta" : "Area Row Alpha"
        }),
        processedAt: "2026-01-01T00:00:00.000Z"
      }
    }));
    const areaPortWithRows: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({ areaId: "area_alpha", name: "Area Row Alpha" }),
          buildAreaListItemFixture({ areaId: "area_beta", name: "Area Row Beta" })
        ],
        total: 2,
        limit: 100,
        offset: 0
      })),
      processArea
    };
    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithRows}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const betaRow = await screen.findByRole("button", { name: /area row beta/i });
    fireEvent.contextMenu(betaRow, { clientX: 32, clientY: 104 });

    const menu = screen.getByRole("menu", { name: /area context menu for area row beta/i });
    const openMenuItem = within(menu).getByRole("menuitem", { name: "Open Area" });
    expect(openMenuItem).toBeInTheDocument();
    await waitFor(() => {
      expect(openMenuItem).toHaveFocus();
    });
    expect(
      within(menu).getByRole("menuitem", { name: "Check Terrain Readiness" })
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Check Texture Readiness" })
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Check Direct Texture Delivery" })
    ).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Refresh Areas" })).toBeInTheDocument();

    fireEvent.click(openMenuItem);

    await waitFor(() => {
      expect(processArea).toHaveBeenCalledWith("token", "area_beta", { bypassCache: false });
    });
    expect(screen.queryByRole("menu", { name: /area context menu/i })).not.toBeInTheDocument();
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.areas.row_context_menu",
      expect.objectContaining({ areaId: "area_beta" })
    );
  });

  it("opens an area actions context menu from the visible row action button", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithRows: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({ areaId: "area_alpha", name: "Area Alpha" }),
          buildAreaListItemFixture({ areaId: "area_beta", name: "Area Beta" })
        ],
        total: 2,
        limit: 100,
        offset: 0
      }))
    };
    const trackTelemetryEvent = vi.fn();

    window.sessionStorage.removeItem(AREAS_MODE_SELECTED_SCENE_STORAGE_KEY);
    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithRows}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area beta/i });
    const actionButton = screen.getAllByRole("button", {
      name: "Open area actions menu"
    })[1];
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    const menu = screen.getByRole("menu", { name: /area context menu for area beta/i });
    expect(within(menu).getByRole("menuitem", { name: "Open Area" })).toBeInTheDocument();
    expect(actionButton).toHaveAttribute("aria-expanded", "true");
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.areas.row_context_menu",
      expect.objectContaining({ areaId: "area_beta", source: "row_action" })
    );
  });

  it("surfaces selected area quick actions without opening area rows directly", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processArea = vi.fn(async (_accessToken: string, areaId: string) => ({
      cache: {
        key: `cache_${areaId}`,
        hit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0
      },
      area: {
        ...buildAreaDetailFixture({
          areaId,
          name: areaId === "area_beta" ? "Area Row Beta" : "Area Row Alpha"
        }),
        processedAt: "2026-01-01T00:00:00.000Z"
      }
    }));
    const areaPortWithRows: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({ areaId: "area_alpha", name: "Area Row Alpha" }),
          buildAreaListItemFixture({ areaId: "area_beta", name: "Area Row Beta" })
        ],
        total: 2,
        limit: 100,
        offset: 0
      })),
      processArea
    };
    const trackTelemetryEvent = vi.fn();

    window.sessionStorage.removeItem(AREAS_MODE_SELECTED_SCENE_STORAGE_KEY);
    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithRows}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const betaRow = await screen.findByRole("button", { name: /area row beta/i });
    const workflow = screen.getByRole("group", { name: /areas mode workflow/i });
    const openedAreaStatus = within(workflow).getByLabelText("Opened area status");
    expect(openedAreaStatus).not.toHaveTextContent("Area Row Beta");

    fireEvent.click(betaRow);
    expect(betaRow).toHaveAttribute("aria-pressed", "true");
    expect(processArea).not.toHaveBeenCalled();
    expect(openedAreaStatus).not.toHaveTextContent("Area Row Beta");

    const quickActions = screen.getByLabelText("selected area quick actions");
    expect(within(quickActions).getByText("Area Row Beta")).toBeInTheDocument();
    fireEvent.click(
      within(quickActions).getByRole("button", {
        name: "Selected area actions menu"
      })
    );
    expect(screen.getByRole("menu", { name: /area context menu for area row beta/i }))
      .toBeInTheDocument();

    fireEvent.doubleClick(betaRow);
    expect(processArea).not.toHaveBeenCalled();
    expect(trackTelemetryEvent).not.toHaveBeenCalledWith(
      "ui.workspace.areas.row_open_shortcut",
      expect.anything()
    );

    fireEvent.click(
      within(quickActions).getByRole("button", {
        name: /open selected area/i
      })
    );
    await waitFor(() => {
      expect(processArea).toHaveBeenCalledWith("token", "area_beta", { bypassCache: false });
    });
    await waitFor(() => {
      expect(openedAreaStatus).toHaveTextContent("Area Row Beta");
    });
  });

  it("renders area texture readiness metadata from process and proxy contract results", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const trackTelemetryEvent = vi.fn();
    const areaPortWithTextureReadiness: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_ready",
            name: "Area Texture Ready",
            textureAtlasId: "atlas_area_texture_ready"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea: vi.fn(async () => ({
        cache: {
          key: "4f8c2a1b9e7d6c5a",
          hit: false,
          storedAt: "2026-06-16T18:20:00.000Z",
          hits: 0
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_ready",
            name: "Area Texture Ready",
            previewImageUrl: "/preview/area_texture_ready.webp",
            textureAtlas: {
              atlasId: "atlas_area_texture_ready",
              cacheKey: "atlas_area_texture_ready:3x3",
              strategy: "blob-cache",
              objectKey: "modules/current/areas/atlases/atlas_area_texture_ready.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              etag: "atlas-area-texture-ready"
            }
          }),
          processedAt: "2026-06-16T18:20:00.000Z"
        }
      })),
      getAreaTextureAtlasContracts: vi.fn(async () => ({
        cacheKey: "4f8c2a1b9e7d6c5a",
        textureAtlas: {
          mode: "proxy",
          atlasId: "atlas_area_texture_ready",
          objectKey: "modules/current/areas/atlases/atlas_area_texture_ready.webp",
          contentType: "image/webp",
          sizeBytes: 262144,
          etag: "atlas-area-texture-ready",
          proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
          proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"
        }
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithTextureReadiness}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture ready/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Texture Readiness" }));

    const status = await screen.findByLabelText("area texture readiness status");
    expect(status).toHaveClass("area-readiness-detail-panel");
    expect(status.querySelector(".area-readiness-property-list")).not.toBeNull();
    expect(within(status).getByRole("heading", { name: "Texture Readiness Ready" }))
      .toBeInTheDocument();
    expect(within(status).getByText("4f8c2a1b9e7d6c5a")).toBeInTheDocument();
    expect(within(status).getByText("proxy")).toBeInTheDocument();
    expect(within(status).getByText("atlas_area_texture_ready")).toBeInTheDocument();
    expect(
      within(status).getByText("modules/current/areas/atlases/atlas_area_texture_ready.webp")
    ).toBeInTheDocument();
    expect(within(status).getByText("/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"))
      .toBeInTheDocument();
    expect(areaPortWithTextureReadiness.processArea).toHaveBeenCalledWith(
      "token",
      "area_texture_ready",
      { bypassCache: undefined }
    );
    expect(areaPortWithTextureReadiness.getAreaTextureAtlasContracts).toHaveBeenCalledWith(
      "token",
      "4f8c2a1b9e7d6c5a",
      "proxy"
    );
  });

  it("keeps terrain readiness diagnostics compact inside the area selection panel", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithTerrainReadiness: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_terrain_ready",
            name: "Area Terrain Ready",
            width: 4,
            height: 4
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () =>
        buildAreaDetailFixture({
          areaId: "area_terrain_ready",
          name: "Area Terrain Ready",
          width: 4,
          height: 4
        })
      )
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithTerrainReadiness}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area terrain ready/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Terrain Readiness" }));

    const status = await screen.findByLabelText("area terrain readiness status");
    expect(status).toHaveClass("area-readiness-detail-panel");
    expect(status.querySelector(".area-readiness-property-list")).not.toBeNull();
    expect(within(status).getByRole("heading", { name: "Terrain Readiness" }))
      .toBeInTheDocument();
    expect(areaPortWithTerrainReadiness.getAreaById).toHaveBeenCalledWith(
      "token",
      "area_terrain_ready"
    );
  });

  it("renders direct texture delivery unavailable as blocked readiness status", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithBlockedDirectTexture: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_blocked",
            name: "Area Texture Blocked"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea: vi.fn(async () => ({
        cache: {
          key: "7d6c5a4f8c2a1b9e",
          hit: true,
          storedAt: "2026-06-16T18:25:00.000Z",
          hits: 4
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_blocked",
            name: "Area Texture Blocked"
          }),
          processedAt: "2026-06-16T18:25:00.000Z"
        }
      })),
      getAreaTextureAtlasContracts: vi.fn(async () => {
        throw new AreaApiRequestError(
          "Direct area delivery is unavailable without blob storage settings.",
          422,
          "AREA_DIRECT_DELIVERY_UNAVAILABLE"
        );
      })
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithBlockedDirectTexture}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture blocked/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Direct Texture Delivery" }));

    const status = await screen.findByLabelText("area texture readiness status");
    expect(within(status).getByRole("heading", { name: "Texture Readiness Blocked" }))
      .toBeInTheDocument();
    expect(within(status).getByText("direct")).toBeInTheDocument();
    expect(within(status).getByText("texture-contract")).toBeInTheDocument();
    expect(within(status).getByText("7d6c5a4f8c2a1b9e")).toBeInTheDocument();
    expect(within(status).getByText("AREA_DIRECT_DELIVERY_UNAVAILABLE"))
      .toBeInTheDocument();
    expect(
      within(status).getByText("Direct area delivery is unavailable without blob storage settings.")
    ).toBeInTheDocument();
    expect(within(status).getByText("yes")).toBeInTheDocument();
    expect(areaPortWithBlockedDirectTexture.getAreaTextureAtlasContracts).toHaveBeenCalledWith(
      "token",
      "7d6c5a4f8c2a1b9e",
      "direct"
    );
  });

  it("renders process-stage texture readiness failures without cache or direct delivery state", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithProcessFailure: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_process_failed",
            name: "Area Texture Process Failed"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea: vi.fn(async () => {
        throw new AreaApiRequestError(
          "Area processing failed before a texture cache was created.",
          503,
          "AREA_PROCESS_FAILED"
        );
      }),
      getAreaTextureAtlasContracts: vi.fn()
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithProcessFailure}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture process failed/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Texture Readiness" }));

    const status = await screen.findByLabelText("area texture readiness status");
    expect(within(status).getByRole("heading", { name: "Texture Readiness Blocked" }))
      .toBeInTheDocument();
    expect(within(status).getByText("proxy")).toBeInTheDocument();
    expect(within(status).getByText("process")).toBeInTheDocument();
    expect(within(status).getByText("AREA_PROCESS_FAILED")).toBeInTheDocument();
    expect(
      within(status).getByText("Area processing failed before a texture cache was created.")
    ).toBeInTheDocument();
    expect(within(status).queryByText("direct unavailable")).not.toBeInTheDocument();
    expect(within(status).queryByText("7d6c5a4f8c2a1b9e")).not.toBeInTheDocument();
    expect(areaPortWithProcessFailure.getAreaTextureAtlasContracts).not.toHaveBeenCalled();
  });

  it("renders texture-contract failures with cache metadata and no direct delivery state", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithTextureContractFailure: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_contract_failed",
            name: "Area Texture Contract Failed"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea: vi.fn(async () => ({
        cache: {
          key: "texture-contract-cache-001",
          hit: false,
          storedAt: "2026-06-16T21:05:00.000Z",
          hits: 0
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_contract_failed",
            name: "Area Texture Contract Failed"
          }),
          processedAt: "2026-06-16T21:05:00.000Z"
        }
      })),
      getAreaTextureAtlasContracts: vi.fn(async () => {
        throw new AreaApiRequestError(
          "Texture atlas contract lookup failed after processing.",
          500,
          "AREA_TEXTURE_CONTRACT_FAILED"
        );
      })
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithTextureContractFailure}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture contract failed/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Texture Readiness" }));

    const status = await screen.findByLabelText("area texture readiness status");
    expect(within(status).getByRole("heading", { name: "Texture Readiness Blocked" }))
      .toBeInTheDocument();
    expect(within(status).getByText("proxy")).toBeInTheDocument();
    expect(within(status).getByText("texture-contract")).toBeInTheDocument();
    expect(within(status).getByText("texture-contract-cache-001")).toBeInTheDocument();
    expect(within(status).getByText("AREA_TEXTURE_CONTRACT_FAILED"))
      .toBeInTheDocument();
    expect(
      within(status).getByText("Texture atlas contract lookup failed after processing.")
    ).toBeInTheDocument();
    expect(within(status).queryByText("direct unavailable")).not.toBeInTheDocument();
    expect(areaPortWithTextureContractFailure.getAreaTextureAtlasContracts).toHaveBeenCalledWith(
      "token",
      "texture-contract-cache-001",
      "proxy"
    );
  });

  it("renders infrastructure runtime-health readiness failures distinctly", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithInfrastructureFailure: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_infra_failed",
            name: "Area Texture Infra Failed"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
      getAreaTextureAtlasContracts: vi.fn()
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithInfrastructureFailure}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture infra failed/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Texture Readiness" }));

    const status = await screen.findByLabelText("area texture readiness status");
    expect(within(status).getByRole("heading", { name: "Texture Readiness Blocked" }))
      .toBeInTheDocument();
    expect(within(status).getByText("process")).toBeInTheDocument();
    expect(within(status).getByText("Failed to fetch")).toBeInTheDocument();
    expect(within(status).getByText("runtime health")).toBeInTheDocument();
    expect(within(status).getByText("infrastructure_runtime_health")).toBeInTheDocument();
    expect(within(status).queryByText("direct unavailable")).not.toBeInTheDocument();
    expect(areaPortWithInfrastructureFailure.getAreaTextureAtlasContracts).not.toHaveBeenCalled();
  });

  it("keeps malformed texture contract failures out of the infrastructure runtime-health label", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithMalformedTextureContract: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_malformed_contract",
            name: "Area Texture Malformed Contract"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea: vi.fn(async () => ({
        cache: {
          key: "malformed-contract-cache-001",
          hit: false,
          storedAt: "2026-06-17T00:40:00.000Z",
          hits: 0
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_malformed_contract",
            name: "Area Texture Malformed Contract"
          }),
          processedAt: "2026-06-17T00:40:00.000Z"
        }
      })),
      getAreaTextureAtlasContracts: vi.fn(async () => {
        throw new Error("Invalid Areas texture contract: atlasId is required.");
      })
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithMalformedTextureContract}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture malformed contract/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Texture Readiness" }));

    const status = await screen.findByLabelText("area texture readiness status");
    expect(within(status).getByRole("heading", { name: "Texture Readiness Blocked" }))
      .toBeInTheDocument();
    expect(within(status).getByText("texture-contract")).toBeInTheDocument();
    expect(within(status).getByText("malformed-contract-cache-001")).toBeInTheDocument();
    expect(
      within(status).getByText("Invalid Areas texture contract: atlasId is required.")
    ).toBeInTheDocument();
    expect(within(status).queryByText("runtime health")).not.toBeInTheDocument();
    expect(within(status).queryByText("infrastructure_runtime_health")).not.toBeInTheDocument();
  });

  it("keeps texture readiness action names stable and blocks concurrent checks while busy", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processAreaDeferred = createDeferred<{
      cache: {
        key: string;
        hit: boolean;
        storedAt: string;
        hits: number;
      };
      area: AreaApiDetail & { processedAt: string };
    }>();
    const areaPortWithBusyTextureReadiness: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_busy",
            name: "Area Texture Busy",
            textureAtlasId: "atlas_area_texture_busy"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea: vi.fn(() => processAreaDeferred.promise),
      getAreaTextureAtlasContracts: vi.fn(async () => ({
        cacheKey: "busy-cache-key-001",
        textureAtlas: {
          mode: "proxy",
          atlasId: "atlas_area_texture_busy",
          objectKey: "modules/current/areas/atlases/atlas_area_texture_busy.webp",
          contentType: "image/webp",
          sizeBytes: 65536,
          etag: "busy-etag-001",
          proxyPath: "/api/v1/areas/cache/busy-cache-key-001/textures",
          proxyUrl: "/api/v1/areas/cache/busy-cache-key-001/textures"
        }
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithBusyTextureReadiness}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture busy/i });
    const proxyAction = screen.getByRole("button", { name: "Check Texture Readiness" });
    const directAction = screen.getByRole("button", { name: "Check Direct Texture Delivery" });

    fireEvent.click(proxyAction);

    expect(await screen.findByText("Checking texture readiness...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Texture Readiness" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Check Direct Texture Delivery" })).toBeDisabled();
    expect(screen.getByText("Texture...")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check Direct Texture Delivery" }));
    expect(areaPortWithBusyTextureReadiness.processArea).toHaveBeenCalledTimes(1);
    expect(areaPortWithBusyTextureReadiness.getAreaTextureAtlasContracts).not.toHaveBeenCalled();

    await act(async () => {
      processAreaDeferred.resolve({
        cache: {
          key: "busy-cache-key-001",
          hit: false,
          storedAt: "2026-06-16T20:20:00.000Z",
          hits: 0
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_busy",
            name: "Area Texture Busy",
            textureAtlas: {
              atlasId: "atlas_area_texture_busy",
              cacheKey: "atlas_area_texture_busy:3x3",
              strategy: "blob-cache",
              objectKey: "modules/current/areas/atlases/atlas_area_texture_busy.webp",
              contentType: "image/webp",
              sizeBytes: 65536,
              etag: "busy-etag-001"
            }
          }),
          processedAt: "2026-06-16T20:20:00.000Z"
        }
      });
    });

    const status = await screen.findByLabelText("area texture readiness status");
    expect(within(status).getByRole("heading", { name: "Texture Readiness Ready" }))
      .toBeInTheDocument();
    expect(within(status).getByText("busy-cache-key-001")).toBeInTheDocument();
    expect(within(status).getByText("atlas_area_texture_busy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Texture Readiness" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Check Direct Texture Delivery" })).not.toBeDisabled();
    expect(areaPortWithBusyTextureReadiness.getAreaTextureAtlasContracts).toHaveBeenCalledTimes(1);
  });

  it("keeps ready texture readiness status stable through unrelated area actions and clears it on area change", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithPersistentTextureReadiness: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_ready",
            name: "Area Texture Ready",
            textureAtlasId: "atlas_area_texture_ready"
          }),
          buildAreaListItemFixture({
            areaId: "area_texture_other",
            name: "Area Texture Other",
            textureAtlasId: "atlas_area_texture_other"
          })
        ],
        total: 2,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_texture_ready",
        name: "Area Texture Ready"
      })),
      processArea: vi.fn(async () => ({
        cache: {
          key: "ready-cache-key-001",
          hit: false,
          storedAt: "2026-06-16T20:05:00.000Z",
          hits: 0
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_ready",
            name: "Area Texture Ready",
            textureAtlas: {
              atlasId: "atlas_area_texture_ready",
              cacheKey: "atlas_area_texture_ready:3x3",
              strategy: "blob-cache",
              objectKey: "modules/current/areas/atlases/atlas_area_texture_ready.webp",
              contentType: "image/webp",
              sizeBytes: 131072,
              etag: "ready-etag-001"
            }
          }),
          processedAt: "2026-06-16T20:05:00.000Z"
        }
      })),
      getAreaTextureAtlasContracts: vi.fn(async () => ({
        cacheKey: "ready-cache-key-001",
        textureAtlas: {
          mode: "proxy",
          atlasId: "atlas_area_texture_ready",
          objectKey: "modules/current/areas/atlases/atlas_area_texture_ready.webp",
          contentType: "image/webp",
          sizeBytes: 131072,
          etag: "ready-etag-001",
          proxyPath: "/api/v1/areas/cache/ready-cache-key-001/textures",
          proxyUrl: "/api/v1/areas/cache/ready-cache-key-001/textures"
        }
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithPersistentTextureReadiness}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture ready/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Texture Readiness" }));

    const readyStatus = await screen.findByLabelText("area texture readiness status");
    expect(within(readyStatus).getByRole("heading", { name: "Texture Readiness Ready" }))
      .toBeInTheDocument();
    expect(within(readyStatus).getByText("ready-cache-key-001")).toBeInTheDocument();
    expect(within(readyStatus).getByText("atlas_area_texture_ready")).toBeInTheDocument();
    expect(within(readyStatus).getByText("ready-etag-001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));
    await waitFor(() => {
      expect(areaPortWithPersistentTextureReadiness.processArea).toHaveBeenCalledWith(
        "token",
        "area_texture_ready",
        { bypassCache: false }
      );
    });
    fireEvent.click(screen.getByRole("tab", { name: /select area/i }));
    const persistedStatus = screen.getByLabelText("area texture readiness status");
    expect(within(persistedStatus).getByText("ready-cache-key-001")).toBeInTheDocument();
    expect(within(persistedStatus).getByText("atlas_area_texture_ready")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /area texture other/i }));
    await waitFor(() => {
      expect(screen.queryByLabelText("area texture readiness status")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("ready-cache-key-001")).not.toBeInTheDocument();
    expect(screen.queryByText("atlas_area_texture_ready")).not.toBeInTheDocument();
    expect(screen.queryByText("ready-etag-001")).not.toBeInTheDocument();
  });

  it("clears blocked direct texture readiness metadata when selected area changes", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithBlockedTextureIsolation: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_blocked",
            name: "Area Texture Blocked"
          }),
          buildAreaListItemFixture({
            areaId: "area_texture_clear",
            name: "Area Texture Clear"
          })
        ],
        total: 2,
        limit: 100,
        offset: 0
      })),
      processArea: vi.fn(async () => ({
        cache: {
          key: "blocked-cache-key-001",
          hit: true,
          storedAt: "2026-06-16T20:10:00.000Z",
          hits: 2
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_blocked",
            name: "Area Texture Blocked"
          }),
          processedAt: "2026-06-16T20:10:00.000Z"
        }
      })),
      getAreaTextureAtlasContracts: vi.fn(async () => {
        throw new AreaApiRequestError(
          "Direct area delivery is unavailable without blob storage settings.",
          422,
          "AREA_DIRECT_DELIVERY_UNAVAILABLE"
        );
      })
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithBlockedTextureIsolation}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture blocked/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Direct Texture Delivery" }));

    const blockedStatus = await screen.findByLabelText("area texture readiness status");
    expect(within(blockedStatus).getByRole("heading", { name: "Texture Readiness Blocked" }))
      .toBeInTheDocument();
    expect(within(blockedStatus).getByText("blocked-cache-key-001")).toBeInTheDocument();
    expect(within(blockedStatus).getByText("AREA_DIRECT_DELIVERY_UNAVAILABLE"))
      .toBeInTheDocument();
    expect(
      within(blockedStatus).getByText("Direct area delivery is unavailable without blob storage settings.")
    ).toBeInTheDocument();
    expect(within(blockedStatus).getByText("yes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /area texture clear/i }));
    await waitFor(() => {
      expect(screen.queryByLabelText("area texture readiness status")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("blocked-cache-key-001")).not.toBeInTheDocument();
    expect(screen.queryByText("AREA_DIRECT_DELIVERY_UNAVAILABLE")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Direct area delivery is unavailable without blob storage settings.")
    ).not.toBeInTheDocument();
  });

  it("retries direct texture readiness after a blocked result and replaces stale error metadata", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processArea = vi
      .fn()
      .mockResolvedValueOnce({
        cache: {
          key: "retry-blocked-cache-001",
          hit: true,
          storedAt: "2026-06-16T21:30:00.000Z",
          hits: 3
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_retry",
            name: "Area Texture Retry"
          }),
          processedAt: "2026-06-16T21:30:00.000Z"
        }
      })
      .mockResolvedValueOnce({
        cache: {
          key: "retry-ready-cache-002",
          hit: false,
          storedAt: "2026-06-16T21:31:00.000Z",
          hits: 0
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_retry",
            name: "Area Texture Retry",
            textureAtlas: {
              atlasId: "atlas_area_texture_retry_ready",
              cacheKey: "atlas_area_texture_retry_ready:3x3",
              strategy: "blob-cache",
              objectKey: "modules/current/areas/atlases/atlas_area_texture_retry_ready.webp",
              contentType: "image/webp",
              sizeBytes: 98304,
              etag: "retry-ready-etag-002"
            }
          }),
          processedAt: "2026-06-16T21:31:00.000Z"
        }
      });
    const getAreaTextureAtlasContracts = vi
      .fn()
      .mockRejectedValueOnce(
        new AreaApiRequestError(
          "Direct area delivery is unavailable without blob storage settings.",
          422,
          "AREA_DIRECT_DELIVERY_UNAVAILABLE"
        )
      )
      .mockResolvedValueOnce({
        cacheKey: "retry-ready-cache-002",
        textureAtlas: {
          mode: "direct",
          atlasId: "atlas_area_texture_retry_ready",
          objectKey: "modules/current/areas/atlases/atlas_area_texture_retry_ready.webp",
          contentType: "image/webp",
          sizeBytes: 98304,
          etag: "retry-ready-etag-002",
          proxyPath: "/api/v1/areas/cache/retry-ready-cache-002/textures",
          proxyUrl: "/api/v1/areas/cache/retry-ready-cache-002/textures",
          directUrl: "https://example.invalid/areas/retry-ready.webp"
        }
      });
    const areaPortWithRetryableDirectTexture: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_retry",
            name: "Area Texture Retry"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea,
      getAreaTextureAtlasContracts
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithRetryableDirectTexture}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture retry/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Direct Texture Delivery" }));

    const blockedStatus = await screen.findByLabelText("area texture readiness status");
    expect(within(blockedStatus).getByRole("heading", { name: "Texture Readiness Blocked" }))
      .toBeInTheDocument();
    expect(within(blockedStatus).getByText("retry-blocked-cache-001")).toBeInTheDocument();
    expect(within(blockedStatus).getByText("AREA_DIRECT_DELIVERY_UNAVAILABLE"))
      .toBeInTheDocument();
    expect(within(blockedStatus).getByText("yes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check Direct Texture Delivery" }));

    const readyStatus = await screen.findByLabelText("area texture readiness status");
    expect(within(readyStatus).getByRole("heading", { name: "Texture Readiness Ready" }))
      .toBeInTheDocument();
    expect(within(readyStatus).getByText("direct")).toBeInTheDocument();
    expect(within(readyStatus).getByText("retry-ready-cache-002")).toBeInTheDocument();
    expect(within(readyStatus).getByText("atlas_area_texture_retry_ready")).toBeInTheDocument();
    expect(within(readyStatus).getByText("retry-ready-etag-002")).toBeInTheDocument();
    expect(screen.queryByText("retry-blocked-cache-001")).not.toBeInTheDocument();
    expect(screen.queryByText("AREA_DIRECT_DELIVERY_UNAVAILABLE")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Direct area delivery is unavailable without blob storage settings.")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("direct unavailable")).not.toBeInTheDocument();
    expect(processArea).toHaveBeenCalledTimes(2);
    expect(getAreaTextureAtlasContracts).toHaveBeenNthCalledWith(
      1,
      "token",
      "retry-blocked-cache-001",
      "direct"
    );
    expect(getAreaTextureAtlasContracts).toHaveBeenNthCalledWith(
      2,
      "token",
      "retry-ready-cache-002",
      "direct"
    );
  });

  it("retries proxy texture readiness after a ready result and replaces stale atlas metadata", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processArea = vi
      .fn()
      .mockResolvedValueOnce({
        cache: {
          key: "retry-ready-cache-001",
          hit: false,
          storedAt: "2026-06-16T21:35:00.000Z",
          hits: 0
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_ready_then_blocked",
            name: "Area Texture Ready Then Blocked",
            textureAtlas: {
              atlasId: "atlas_area_texture_ready_then_blocked",
              cacheKey: "atlas_area_texture_ready_then_blocked:3x3",
              strategy: "blob-cache",
              objectKey: "modules/current/areas/atlases/atlas_area_texture_ready_then_blocked.webp",
              contentType: "image/webp",
              sizeBytes: 114688,
              etag: "retry-first-ready-etag"
            }
          }),
          processedAt: "2026-06-16T21:35:00.000Z"
        }
      })
      .mockResolvedValueOnce({
        cache: {
          key: "retry-blocked-cache-002",
          hit: true,
          storedAt: "2026-06-16T21:36:00.000Z",
          hits: 1
        },
        area: {
          ...buildAreaDetailFixture({
            areaId: "area_texture_ready_then_blocked",
            name: "Area Texture Ready Then Blocked"
          }),
          processedAt: "2026-06-16T21:36:00.000Z"
        }
      });
    const getAreaTextureAtlasContracts = vi
      .fn()
      .mockResolvedValueOnce({
        cacheKey: "retry-ready-cache-001",
        textureAtlas: {
          mode: "proxy",
          atlasId: "atlas_area_texture_ready_then_blocked",
          objectKey: "modules/current/areas/atlases/atlas_area_texture_ready_then_blocked.webp",
          contentType: "image/webp",
          sizeBytes: 114688,
          etag: "retry-first-ready-etag",
          proxyPath: "/api/v1/areas/cache/retry-ready-cache-001/textures",
          proxyUrl: "/api/v1/areas/cache/retry-ready-cache-001/textures"
        }
      })
      .mockRejectedValueOnce(
        new AreaApiRequestError(
          "Texture atlas contract lookup failed after retry.",
          500,
          "AREA_TEXTURE_CONTRACT_RETRY_FAILED"
        )
      );
    const areaPortWithReadyThenBlockedTexture: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_texture_ready_then_blocked",
            name: "Area Texture Ready Then Blocked"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processArea,
      getAreaTextureAtlasContracts
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithReadyThenBlockedTexture}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area texture ready then blocked/i });
    fireEvent.click(screen.getByRole("button", { name: "Check Texture Readiness" }));

    const readyStatus = await screen.findByLabelText("area texture readiness status");
    expect(within(readyStatus).getByRole("heading", { name: "Texture Readiness Ready" }))
      .toBeInTheDocument();
    expect(within(readyStatus).getByText("retry-ready-cache-001")).toBeInTheDocument();
    expect(within(readyStatus).getByText("atlas_area_texture_ready_then_blocked"))
      .toBeInTheDocument();
    expect(
      within(readyStatus).getByText(
        "modules/current/areas/atlases/atlas_area_texture_ready_then_blocked.webp"
      )
    ).toBeInTheDocument();
    expect(within(readyStatus).getByText("retry-first-ready-etag")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check Texture Readiness" }));

    const blockedStatus = await screen.findByLabelText("area texture readiness status");
    expect(within(blockedStatus).getByRole("heading", { name: "Texture Readiness Blocked" }))
      .toBeInTheDocument();
    expect(within(blockedStatus).getByText("retry-blocked-cache-002")).toBeInTheDocument();
    expect(within(blockedStatus).getByText("AREA_TEXTURE_CONTRACT_RETRY_FAILED"))
      .toBeInTheDocument();
    expect(within(blockedStatus).getByText("Texture atlas contract lookup failed after retry."))
      .toBeInTheDocument();
    expect(screen.queryByText("retry-ready-cache-001")).not.toBeInTheDocument();
    expect(screen.queryByText("atlas_area_texture_ready_then_blocked")).not.toBeInTheDocument();
    expect(
      screen.queryByText("modules/current/areas/atlases/atlas_area_texture_ready_then_blocked.webp")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("retry-first-ready-etag")).not.toBeInTheDocument();
    expect(processArea).toHaveBeenCalledTimes(2);
    expect(getAreaTextureAtlasContracts).toHaveBeenNthCalledWith(
      1,
      "token",
      "retry-ready-cache-001",
      "proxy"
    );
    expect(getAreaTextureAtlasContracts).toHaveBeenNthCalledWith(
      2,
      "token",
      "retry-blocked-cache-002",
      "proxy"
    );
  });

  it("wires the scene object sound Properties affordance into the viewport", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithSoundObject: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_sound_properties",
            name: "Area Sound Properties",
            objectCounts: {
              placeables: 0,
              doors: 0,
              creatures: 0,
              items: 0,
              sounds: 1,
              total: 1
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_sound_properties",
        name: "Area Sound Properties",
        composition: {
          placeables: 0,
          doors: 0,
          creatures: 0,
          items: 0,
          sounds: 1,
          total: 1
        },
        objects: [
          {
            objectId: "snd_amb_01",
            kind: "sound",
            templateId: "sound_forest_01",
            resRef: "sound_forest_01",
            x: 1,
            y: 1,
            z: 0,
            bearing: 0
          }
        ]
      }))
    };
    attachProcessAreaFromDetail(areaPortWithSoundObject);

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithSoundObject}
        placeableApiPort={placeableApiPortStub}
        soundApiPort={soundApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));
    await waitFor(() => {
      expect(
        within(screen.getByLabelText("Opened area status")).getByText("Area Sound Properties")
      ).toBeInTheDocument();
    });

    const selector = screen.getByRole("combobox", { name: /^object type selector$/i });
    fireEvent.change(selector, { target: { value: "sounds" } });

    const soundsList = screen.getByRole("list", { name: /sounds list/i });
    const row = within(soundsList).getByRole("button", { name: /sound_forest_01/i });
    const item = row.closest("li");
    expect(item).not.toBeNull();
    fireEvent.click(within(item as HTMLElement).getByRole("button", { name: /open object properties/i }));

    await waitFor(() => {
      const calls = viewportWiringHarness.viewportPropsSpy.mock.calls;
      const latestProps = calls[calls.length - 1]?.[0] as {
        sidebarPropertiesSignal?: { objectId: string; objectKind: string } | null;
      };
      expect(latestProps.sidebarPropertiesSignal).toMatchObject({
        objectId: "area_sound_properties:snd_amb_01",
        objectKind: "sounds"
      });
    });
  });

  it("wires backend sound template create action into the viewport", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        soundApiPort={soundApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /add objects/i }));
    const addObjectsSection = await screen.findByRole("article", {
      name: /add objects section/i
    });
    const selector = within(addObjectsSection).getByRole("combobox", {
      name: /^add object type selector$/i
    });
    fireEvent.change(selector, { target: { value: "sounds" } });

    const soundsList = await within(addObjectsSection).findByRole("list", {
      name: /sounds add list/i
    });
    const row = within(soundsList).getByRole("button", {
      name: /preview sound_amb_city_market_day/i
    });
    const item = row.closest("li");
    expect(item).not.toBeNull();
    fireEvent.click(
      within(item as HTMLElement).getByRole("button", { name: /place object on canvas/i })
    );

    await waitFor(() => {
      const calls = viewportWiringHarness.viewportPropsSpy.mock.calls;
      const latestProps = calls[calls.length - 1]?.[0] as {
        canvasCreateObjectSignal?: {
          template?: {
            id?: string;
            kind?: string;
            resRef?: string;
            soundPositioning?: {
              preserve?: {
                extra?: Record<string, unknown>;
              };
            };
          };
        } | null;
      };
      expect(latestProps.canvasCreateObjectSignal?.template).toMatchObject({
        id: "snd_template_sound_ambient_city_market_001",
        kind: "sounds",
        resRef: "amb_city_market_day",
        soundPositioning: {
          preserve: {
            extra: {
              backendSoundId: "sound_ambient_city_market_001",
              soundTemplateSource: "backend-catalog"
            }
          }
        }
      });
    });
  });

  it("switches builder workspace mode to placeables and renders placeables-only left panel", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(screen.getByRole("heading", { name: "Areas" })).toBeInTheDocument();
    const placeablesModeButton = screen.getByRole("button", { name: /placeables mode/i });
    await act(async () => {
      fireEvent.click(placeablesModeButton);
    });

    expect(placeablesModeButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Areas" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Placeables" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Scene Objects" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Placeables Mode" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /plc_barrel_01/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /add object type selector/i })
    ).not.toBeInTheDocument();
  });

  it("switches builder workspace mode to creatures and renders creatures-only left panel", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const creatureApiPort: CreatureApiPort = {
      listCreatures: vi.fn(async () => ({
        items: [
          {
            templateId: "cre_guard_captain",
            resref: "cre_guard",
            name: "Guard Captain",
            category: "npc",
            tags: ["guard"],
            previewImageUrl: "/preview/cre_guard_captain.png",
            metadata: {
              tag: "GUARD_CAPTAIN"
            }
          }
        ],
        total: 1,
        limit: 1000,
        offset: 0
      })),
      processCreature: vi.fn(async () => ({
        cache: {
          key: "cre_guard_captain:v1",
          hit: false,
          storedAt: "2026-01-01T00:00:00.000Z",
          hits: 0
        },
        creature: {
          templateId: "cre_guard_captain",
          kind: "creature",
          resref: "cre_guard",
          name: "Guard Captain",
          category: "npc",
          benchmarkCandidate: false,
          render: {
            backendType: "creature",
            frontendType: "creature",
            rendererPreset: "creature-standard"
          },
          processedAt: "2026-01-01T00:00:00.000Z"
        }
      })),
      getProcessedCreature: vi.fn()
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        creatureApiPort={creatureApiPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const creaturesModeButton = screen.getByRole("button", { name: /creatures mode/i });
    await act(async () => {
      fireEvent.click(creaturesModeButton);
    });

    expect(creaturesModeButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Areas" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Creatures" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Creatures Mode" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /creatures mode section/i })).toHaveClass(
      "creatures-mode-panel"
    );
    expect(await screen.findByText("GUARD_CAPTAIN")).toBeInTheDocument();
    expect(screen.getByTitle("cre_template_cre_guard_captain / cre_guard")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /filter creatures/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Scene Objects" })).not.toBeInTheDocument();
    expect(creatureApiPort.listCreatures).toHaveBeenCalledWith("token", {
      limit: 1000,
      offset: 0
    });
    const latestViewportCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[
        viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1
      ];
    const latestViewportProps = latestViewportCall?.[0] as {
      renderObjectIds?: string[] | null;
      externalSceneSeed?: {
        objects?: Array<{
          creatureProperties?: {
            advancedSettings?: {
              animationState?: number;
            };
          };
        }>;
      } | null;
      toolbarState?: {
        selectionScope?: string;
        visibility?: Record<string, boolean>;
      };
    };
    expect(latestViewportProps.renderObjectIds).toEqual([
      "preview:cre_template_cre_guard_captain"
    ]);
    expect(latestViewportProps.toolbarState?.selectionScope).toBe("creatures");
    expect(latestViewportProps.toolbarState?.visibility?.creatures).toBe(true);
    expect(latestViewportProps.toolbarState?.visibility?.placeables).toBe(false);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Creature animation state"), {
        target: { value: "0" }
      });
    });
    await waitFor(() => {
      const latestCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[
          viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1
        ];
      const props = latestCall?.[0] as typeof latestViewportProps;
      expect(props.externalSceneSeed?.objects?.[0]?.creatureProperties?.advancedSettings?.animationState)
        .toBe(0);
    });
  });

  it("keeps the creature preview aligned with the filtered creature row", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const creatureApiPort: CreatureApiPort = {
      listCreatures: vi.fn(async () => ({
        items: [
          {
            templateId: "cre_auctioneer",
            resref: "auctioneer",
            name: "Auctioneer",
            category: "creature",
            tags: ["npc"],
            previewImageUrl: "/preview/cre_auctioneer.png",
            metadata: {
              tag: "AUCTIONEER"
            }
          },
          {
            templateId: "cre_npc_bimber2",
            resref: "npc_bimber2",
            name: "Bimbrownik2",
            category: "creature",
            tags: ["npc"],
            previewImageUrl: "/preview/cre_npc_bimber2.png",
            metadata: {
              tag: "BIMBROWNIK2"
            }
          }
        ],
        total: 2,
        limit: 1000,
        offset: 0
      })),
      processCreature: vi.fn(async (_accessToken, payload) => {
        const templateId = payload.templateId;
        const isBimber = templateId === "cre_npc_bimber2";
        return {
          cache: {
            key: `${templateId}:v1`,
            hit: payload.bypassCache ? false : true,
            storedAt: "2026-01-01T00:00:00.000Z",
            hits: 0
          },
          creature: {
            templateId,
            kind: "creature",
            resref: isBimber ? "npc_bimber2" : "auctioneer",
            name: isBimber ? "Bimbrownik2" : "Auctioneer",
            category: "creature",
            benchmarkCandidate: false,
            render: {
              backendType: "creature",
              frontendType: "creature",
              rendererPreset: "creature-standard"
            },
            processedAt: "2026-01-01T00:00:00.000Z"
          }
        };
      }),
      getProcessedCreature: vi.fn()
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        creatureApiPort={creatureApiPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /creatures mode/i }));
    });

    expect(await screen.findByText("AUCTIONEER")).toBeInTheDocument();
    const search = screen.getByRole("searchbox", { name: /filter creatures/i });
    await act(async () => {
      fireEvent.change(search, { target: { value: "bimber2" } });
    });

    expect(await screen.findByText("BIMBROWNIK2")).toBeInTheDocument();
    expect(screen.queryByText("AUCTIONEER")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(creatureApiPort.processCreature).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          templateId: "cre_npc_bimber2",
          resref: "npc_bimber2",
          includeBenchmarkMetadata: false
        })
      );
    });
    await waitFor(() => {
      const calls = viewportWiringHarness.viewportPropsSpy.mock.calls;
      const latestProps = calls[calls.length - 1]?.[0] as {
        renderObjectIds?: string[] | null;
      };
      expect(latestProps.renderObjectIds).toEqual([
        "preview:cre_template_cre_npc_bimber2"
      ]);
    });
  });

  it("resets viewport seed and sidebar sizing when switching into focused modes", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const pendingPlaceables = createDeferred<Awaited<ReturnType<PlaceableApiPort["listPlaceables"]>>>();
    const pendingSounds = createDeferred<Awaited<ReturnType<SoundApiPort["listSounds"]>>>();
    const slowPlaceableApiPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(() => pendingPlaceables.promise)
    };
    const slowSoundApiPort: SoundApiPort = {
      ...soundApiPortStub,
      listSounds: vi.fn(() => pendingSounds.promise)
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={slowPlaceableApiPort}
        soundApiPort={slowSoundApiPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const leftSidebar = screen.getByLabelText(/left sidebar/i);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    });

    expect(leftSidebar).toHaveClass("workspace-sidebar-mode-placeables");
    expect(screen.getByRole("article", { name: /placeables mode section/i })).toHaveClass(
      "placeables-mode-panel"
    );
    let latestViewportCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    let latestViewportProps = latestViewportCall?.[0] as {
      externalSceneSeed?: { sceneId?: string; objects?: unknown[] } | null;
      renderObjectIds?: string[] | null;
    };
    expect(latestViewportProps.externalSceneSeed).toMatchObject({
      sceneId: "placeables_mode_empty_preview",
      objects: []
    });
    expect(latestViewportProps.renderObjectIds).toEqual([
      "__placeables_mode_render_none__"
    ]);
    const viewportCallsAfterPlaceables = viewportWiringHarness.viewportPropsSpy.mock.calls.length;

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sounds mode/i }));
    });

    expect(leftSidebar).toHaveClass("workspace-sidebar-mode-sounds");
    expect(screen.getByRole("article", { name: /sounds mode section/i })).toHaveClass(
      "sounds-mode-panel"
    );
    expect(screen.getByRole("region", { name: /sounds mode audio stage/i })).toBeInTheDocument();
    expect(viewportWiringHarness.viewportPropsSpy).toHaveBeenCalledTimes(
      viewportCallsAfterPlaceables
    );
  });

  it("preserves latest area objects when leaving and returning to Areas Mode", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const trackTelemetryEvent = vi.fn();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const latestViewportPropsBeforeEdit = viewportWiringHarness.viewportPropsSpy.mock.calls[
      viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1
    ]?.[0] as {
      externalSceneSeed?: { objects?: Array<{ id: string }> } | null;
      onSceneObjectsSnapshotChange?: (objects: Array<{ id: string }>) => void;
    };
    const addedObject = {
      ...createNewSceneObject("placeables", 1.5, 1.5, 77),
      id: "plc_added_from_area_viewport"
    };

    act(() => {
      latestViewportPropsBeforeEdit.onSceneObjectsSnapshotChange?.([
        ...(latestViewportPropsBeforeEdit.externalSceneSeed?.objects ?? []),
        addedObject
      ]);
    });

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    fireEvent.click(screen.getByRole("button", { name: /areas mode/i }));

    const latestViewportPropsAfterReturn = viewportWiringHarness.viewportPropsSpy.mock.calls[
      viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1
    ]?.[0] as {
      externalSceneSeed?: { objects?: Array<{ id: string }> } | null;
    };
    expect(
      latestViewportPropsAfterReturn.externalSceneSeed?.objects?.some(
        (object) => object.id === "plc_added_from_area_viewport"
      )
    ).toBe(true);
  });

  it("does not render a redundant workspace status strip over the canvas", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(screen.queryByRole("contentinfo", { name: /workspace status/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/workspace canvas/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /scene objects/i })).toBeInTheDocument();
  });

  it("switches builder workspace mode to sounds and renders backend sound catalog panels", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        soundApiPort={soundApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const soundsModeButton = screen.getByRole("button", { name: /sounds mode/i });
    fireEvent.click(soundsModeButton);

    expect(soundsModeButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Areas" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sounds" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sounds Mode" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /sounds mode audio stage/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/workspace canvas/i)).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /filter sounds/i })).toBeInTheDocument();
    const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
    const soundsSearch = within(soundsSection).getByRole("searchbox", {
      name: /filter sounds/i
    });
    await screen.findByText("amb_city_market_day");
    fireEvent.change(soundsSearch, { target: { value: "market" } });
    await waitFor(() => {
      expect(within(soundsSection).getByText("1/1")).toBeInTheDocument();
    });
    const categoryGroup = within(soundsSection).getByRole("group", {
      name: /sound category filter/i
    });
    const sourceGroup = within(soundsSection).getByRole("group", {
      name: /sound source filter/i
    });
    fireEvent.click(within(categoryGroup).getByRole("button", { name: "Music" }));
    fireEvent.click(within(sourceGroup).getByRole("button", { name: "HAK" }));
    expect(within(soundsSection).getByText("0/1")).toBeInTheDocument();

    fireEvent.click(within(soundsSection).getByRole("button", { name: /reset sounds filters/i }));

    await waitFor(() => {
      expect(soundsSearch).toHaveValue("");
      expect(within(categoryGroup).getByRole("button", { name: "All" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(within(sourceGroup).getByRole("button", { name: "All" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
    fireEvent.click(await screen.findByText("amb_city_market_day"));

    expect(await screen.findByText(/GI_sound_area/i)).toBeInTheDocument();
    expect(screen.getByText(/AmbientSoundDay/i)).toBeInTheDocument();
    expect(screen.getByText(/spatialMode:/i)).toBeInTheDocument();
    expect(screen.getByText(/playbackMode:/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Scene Objects" })).not.toBeInTheDocument();
    expect(soundApiPortStub.listSounds).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ limit: 100, offset: 0 })
    );
  });

  it("surfaces backend status when sounds catalog loading fails", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const unauthorizedError = Object.assign(new Error("Unauthorized"), {
      status: 401,
      code: "INVALID_SESSION"
    });
    const failingSoundApiPort: SoundApiPort = {
      ...soundApiPortStub,
      listSounds: vi.fn(async () => {
        throw unauthorizedError;
      })
    };
    const onBackendSessionInvalidated = vi.fn();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        soundApiPort={failingSoundApiPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="sounds_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
        onBackendSessionInvalidated={onBackendSessionInvalidated}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load sounds from backend (401 INVALID_SESSION)."
    );
    expect(onBackendSessionInvalidated).toHaveBeenCalledWith("sounds_catalog", "token");
  });

  it("keeps Sounds Mode catalog playback-first without rendering a canvas sound marker", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const trackTelemetryEvent = vi.fn();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        soundApiPort={soundApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        activeBuilderModeId="sounds_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const soundRow = await screen.findByText("amb_city_market_day");
    fireEvent.click(soundRow);

    expect(screen.getByRole("region", { name: /sounds mode audio stage/i })).toHaveTextContent(
      "amb_city_market_day"
    );
    expect(screen.queryByLabelText(/workspace canvas/i)).not.toBeInTheDocument();
    expect(viewportWiringHarness.viewportPropsSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /place amb_city_market_day on canvas/i })).toBeNull();
    expect(screen.getByRole("button", { name: /play amb_city_market_day/i })).toBeInTheDocument();
    expect(screen.queryByText(/canvasObject:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/sound_ambient_city_market_001/i)).toBeInTheDocument();
    expect(trackTelemetryEvent).not.toHaveBeenCalledWith(
      "ui.workspace.sounds_mode.sound_placed_on_canvas",
      expect.anything()
    );
  });

  it("lists and plays the expanded backend sound catalog with vanilla audio entries", async () => {
    const originalAudio = globalThis.Audio;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const playSpy = vi.fn(async () => undefined);
    const audioInstances: Array<{
      play: typeof playSpy;
      pause: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      removeAttribute: ReturnType<typeof vi.fn>;
      loop: boolean;
      onended: null;
      onerror: null;
    }> = [];
    globalThis.Audio = vi.fn(() => {
      const audio = {
        play: playSpy,
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        loop: false,
        onended: null,
        onerror: null
      };
      audioInstances.push(audio);
      return audio;
    }) as unknown as typeof Audio;
    URL.createObjectURL = vi.fn(() => "blob:vanilla-sound-preview");
    URL.revokeObjectURL = vi.fn();

    const vanillaSound: SoundApiListItem = {
      soundId: "sound_al_an_bees1",
      resref: "al_an_bees1",
      name: "Al An Bees1",
      category: "effect",
      format: "wav",
      tags: ["effect", "wav", "vanilla"],
      benchmark: false,
      previewWaveformUrl: "/assets/previews/sounds/al_an_bees1.webp",
      spatialMode: "2d",
      playbackMode: "random",
      source: {
        layer: "vanilla"
      },
      auroraUsage: {
        bindingKey: "GI_sound_pos",
        sourceField: "PlacedSound",
        defaultsTable: "sounddefaultspos"
      },
      metrics: {
        durationMs: 1248,
        cues: 1,
        emitters: 0
      },
      updatedAt: "2026-06-16T16:59:00.000Z"
    };
    const vanillaBugSound: SoundApiListItem = {
      ...vanillaSound,
      soundId: "sound_al_an_bugs1",
      resref: "al_an_bugs1",
      name: "Al An Bugs1",
      previewWaveformUrl: "/assets/previews/sounds/al_an_bugs1.webp",
      metrics: {
        ...vanillaSound.metrics,
        durationMs: 1098
      }
    };
    const expandedSounds = [
      vanillaSound,
      vanillaBugSound,
      soundListItem,
      ...Array.from({ length: 13 }, (_, index): SoundApiListItem => ({
        ...soundListItem,
        soundId: `sound_port_${index + 1}`,
        resref: `port_${index + 1}`,
        name: `Port ${index + 1}`,
        category: "effect",
        format: "wav",
        tags: ["effect", "wav", "hak"],
        benchmark: false,
        previewWaveformUrl: `/assets/previews/sounds/port_${index + 1}.webp`,
        source: {
          layer: "hak"
        },
        playbackMode: "random",
        auroraUsage: {
          bindingKey: "GI_sound_pos",
          sourceField: "PlacedSound",
          defaultsTable: "sounddefaultspos"
        },
        metrics: {
          durationMs: 5000 + index,
          cues: 1,
          emitters: 0
        }
      }))
    ];
    const expandedSoundApiPort: SoundApiPort = {
      ...soundApiPortStub,
      listSounds: vi.fn(async () => ({
        items: expandedSounds,
        total: 16,
        limit: 100,
        offset: 0
      })),
      processSound: vi.fn(async (_token, soundId) => {
        const selectedSound =
          expandedSounds.find((sound) => sound.soundId === soundId) ?? vanillaSound;
        return {
          cacheKey: "cache_vanilla_bees",
          cacheHit: false,
          storedAt: "2026-06-16T17:00:00.000Z",
          hits: 0,
          sound: {
            ...selectedSound,
            audio: {
              assetId: "audio/module/al_an_bees1",
              cacheKey: "audio/module/al_an_bees1:sound_al_an_bees1",
              strategy: "blob-cache" as const,
              objectKey: "modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav",
              contentType: "audio/wav",
              sizeBytes: 220220,
              format: "wav" as const,
              sampleRateHz: 22050,
              channels: 2 as const
            },
            spatial: {
              mode: "2d" as const,
              loop: false
            },
            playback: {
              mode: "random" as const,
              intervalSeconds: 45,
              ambientOnly: false
            },
            render: {
              backendType: "sound" as const,
              frontendType: "sound" as const,
              playbackPreset: "effect-once"
            },
            processedAt: "2026-06-16T17:00:01.000Z"
          }
        };
      }),
      getSoundAudioContracts: vi.fn(async () => ({
        cacheKey: "cache_vanilla_bees",
        audio: {
          mode: "proxy",
          assetId: "audio/module/al_an_bees1",
          objectKey: "modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav",
          contentType: "audio/wav",
          sizeBytes: 220220,
          proxyPath: "/api/v1/catalog/sounds/cache/cache_vanilla_bees/audio",
          proxyUrl: "/api/v1/catalog/sounds/cache/cache_vanilla_bees/audio"
        }
      })),
      getSoundAudioBlob: vi.fn(async () => new Blob(["vanilla-audio"], { type: "audio/wav" }))
    };
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    try {
      render(
        <WorkspaceLayout
          role="builder"
          userId="u_builder_001"
          workspaceChromeFacade={workspaceChromeFacade}
          sceneViewportPort={sceneViewportPort}
          areaApiPort={areaApiPortStub}
          placeableApiPort={placeableApiPortStub}
          soundApiPort={expandedSoundApiPort}
          backendAccessToken={"token"}
          sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
          trackTelemetryEvent={vi.fn()}
          activeBuilderModeId="sounds_mode"
          toolbarState={toolbarState}
          commandSignal={null}
          workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
          leftCollapsed={false}
          rightCollapsed={false}
          onToggleLeftCollapsed={() => undefined}
          onToggleRightCollapsed={() => undefined}
        />
      );

      const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
      await within(soundsSection).findByText("16");
      const categoryFilter = within(soundsSection).getByRole("group", {
        name: /sound category filter/i
      });
      const sourceFilter = within(soundsSection).getByRole("group", {
        name: /sound source filter/i
      });
      const allSourceButton = within(sourceFilter).getByRole("button", { name: /^all$/i });
      const vanillaSourceButton = within(sourceFilter).getByRole("button", { name: /^vanilla$/i });
      const hakSourceButton = within(sourceFilter).getByRole("button", { name: /^hak$/i });
      const moduleSourceButton = within(sourceFilter).getByRole("button", { name: /^module$/i });
      const otherSourceButton = within(sourceFilter).getByRole("button", { name: /^other$/i });
      expect(allSourceButton).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(within(categoryFilter).getByRole("button", { name: /ambient/i }));
      expect(await within(soundsSection).findByText("1/16")).toBeInTheDocument();
      expect(within(soundsSection).getByText("amb_city_market_day")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("al_an_bees1")).not.toBeInTheDocument();

      fireEvent.click(within(categoryFilter).getByRole("button", { name: /^all$/i }));
      expect(await within(soundsSection).findByText("16")).toBeInTheDocument();
      fireEvent.click(vanillaSourceButton);
      expect(await within(soundsSection).findByText("2/16")).toBeInTheDocument();
      expect(vanillaSourceButton).toHaveAttribute("aria-pressed", "true");
      expect(allSourceButton).toHaveAttribute("aria-pressed", "false");
      expect(within(soundsSection).getByText("al_an_bees1")).toBeInTheDocument();
      expect(within(soundsSection).getByText("al_an_bugs1")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("port_1")).not.toBeInTheDocument();

      fireEvent.click(within(categoryFilter).getByRole("button", { name: /ambient/i }));
      expect(await within(soundsSection).findByText("0/16")).toBeInTheDocument();
      expect(within(soundsSection).getByText("No sounds available.")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("al_an_bees1")).not.toBeInTheDocument();
      expect(within(soundsSection).queryByText("amb_city_market_day")).not.toBeInTheDocument();

      fireEvent.click(within(categoryFilter).getByRole("button", { name: /^all$/i }));
      expect(await within(soundsSection).findByText("2/16")).toBeInTheDocument();
      expect(within(soundsSection).getByText("al_an_bees1")).toBeInTheDocument();

      fireEvent.click(hakSourceButton);
      expect(await within(soundsSection).findByText("13/16")).toBeInTheDocument();
      expect(hakSourceButton).toHaveAttribute("aria-pressed", "true");
      expect(vanillaSourceButton).toHaveAttribute("aria-pressed", "false");
      expect(within(soundsSection).getByText("port_1")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("al_an_bees1")).not.toBeInTheDocument();

      fireEvent.click(moduleSourceButton);
      expect(await within(soundsSection).findByText("1/16")).toBeInTheDocument();
      expect(moduleSourceButton).toHaveAttribute("aria-pressed", "true");
      expect(within(soundsSection).getByText("amb_city_market_day")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("port_1")).not.toBeInTheDocument();

      fireEvent.click(otherSourceButton);
      expect(await within(soundsSection).findByText("0/16")).toBeInTheDocument();
      expect(otherSourceButton).toHaveAttribute("aria-pressed", "true");
      expect(within(soundsSection).getByText("No sounds available.")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("amb_city_market_day")).not.toBeInTheDocument();
      expect(within(soundsSection).queryByText("port_1")).not.toBeInTheDocument();
      expect(within(soundsSection).queryByText("al_an_bees1")).not.toBeInTheDocument();

      fireEvent.click(allSourceButton);
      expect(await within(soundsSection).findByText("16")).toBeInTheDocument();
      expect(allSourceButton).toHaveAttribute("aria-pressed", "true");
      expect(otherSourceButton).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(await within(soundsSection).findByText("al_an_bees1"));

      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
      expect(within(inspector).getByText(/sound_al_an_bees1/i)).toBeInTheDocument();
      expect(within(inspector).getByText(/GI_sound_pos/i)).toBeInTheDocument();
      expect(within(inspector).getByText(/PlacedSound/i)).toBeInTheDocument();
      expect(within(inspector).getByText("source:")).toBeInTheDocument();
      expect(within(inspector).getByText("vanilla")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /place al_an_bees1 on canvas/i })).toBeNull();

      expect(screen.getByRole("region", { name: /sounds mode audio stage/i })).toHaveTextContent(
        "al_an_bees1"
      );
      expect(screen.queryByLabelText(/workspace canvas/i)).not.toBeInTheDocument();
      expect(viewportWiringHarness.viewportPropsSpy).not.toHaveBeenCalled();

      const playButton = screen.getByRole("button", { name: /play al_an_bees1/i });
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(expandedSoundApiPort.processSound).toHaveBeenCalledWith(
          "token",
          "sound_al_an_bees1",
          { bypassCache: false }
        );
        expect(expandedSoundApiPort.getSoundAudioContracts).toHaveBeenCalledWith(
          "token",
          "cache_vanilla_bees",
          "proxy"
        );
        expect(expandedSoundApiPort.getSoundAudioBlob).toHaveBeenCalledWith(
          "token",
          "cache_vanilla_bees"
        );
      });
      await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1));
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(within(inspector).getByText("state:")).toBeInTheDocument();
      expect(within(inspector).getByText("Playing")).toBeInTheDocument();
      expect(screen.getAllByText("Playing")).not.toHaveLength(0);
      const playingStopButton = screen.getByRole("button", { name: /stop al_an_bees1/i });
      expect(playingStopButton).toBeInTheDocument();
      expect(within(inspector).getByText(/vanilla \/ proxy \/ audio\/wav \/ 215 KB/i)).toBeInTheDocument();
      expect(
        within(inspector).getByText(
          "modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav"
        )
      ).toBeInTheDocument();

      fireEvent.click(playingStopButton);
      expectSoundAudioCleanup(audioInstances[0], {
        revokedUrl: "blob:vanilla-sound-preview"
      });
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop al_an_bees1/i })).not.toBeInTheDocument();

      fireEvent.click(playButton);
      await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(2));
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(within(inspector).getByText(/vanilla \/ proxy \/ audio\/wav \/ 215 KB/i)).toBeInTheDocument();
      const secondStopButton = screen.getByRole("button", { name: /stop al_an_bees1/i });
      fireEvent.click(secondStopButton);
      expectSoundAudioCleanup(audioInstances[1], { revokedCallCount: 2 });
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop al_an_bees1/i })).not.toBeInTheDocument();
    } finally {
      globalThis.Audio = originalAudio;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it("loads and plays backend sound audio from the first Play click", async () => {
    const playbackDoubles = installSoundPlaybackTestDoubles();

    try {
      const { unmount, trackTelemetryEvent } = renderSoundsModeWorkspace();

      const playButton = await screen.findByRole("button", { name: /play amb_city_market_day/i });
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(soundApiPortStub.processSound).toHaveBeenCalledWith(
          "token",
          "sound_ambient_city_market_001",
          { bypassCache: false }
        );
        expect(soundApiPortStub.getSoundAudioContracts).toHaveBeenCalledWith(
          "token",
          "cache_sound_abc",
          "proxy"
        );
        expect(soundApiPortStub.getSoundAudioBlob).toHaveBeenCalledWith(
          "token",
          "cache_sound_abc"
        );
      });
      await waitFor(() => {
        expect(playbackDoubles.audio.play).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(
        await screen.findByRole("button", { name: /stop amb_city_market_day/i })
      ).toBeInTheDocument();
      expect(soundApiPortStub.processSound).toHaveBeenCalledTimes(1);
      expect(soundApiPortStub.getSoundAudioContracts).toHaveBeenCalledTimes(1);
      expect(soundApiPortStub.getSoundAudioBlob).toHaveBeenCalledTimes(1);
      expect(playButton).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: /stop amb_city_market_day/i }));

      await waitFor(() => {
        expectSoundAudioCleanup(playbackDoubles.audio, {
          revokedUrl: "blob:sound-preview"
        });
      });
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).toBeNull();
      expect(playButton).not.toBeDisabled();
      expect(trackTelemetryEvent).toHaveBeenCalledWith(
        "ui.workspace.sounds_mode.sound_stopped",
        {
          userId: "u_builder_001",
          soundId: "sound_ambient_city_market_001"
        }
      );
      unmount();
    } finally {
      playbackDoubles.restore();
    }
  });

  it("plays async-loaded sound through unlocked Web Audio when HTML audio would need a second click", async () => {
    const htmlAudioPlay = vi.fn(async () => {
      throw new Error("play() failed because the user didn't interact with the document first.");
    });
    const webAudioStart = vi.fn();
    const playbackDoubles = installSoundPlaybackTestDoubles({
      play: htmlAudioPlay,
      webAudio: {
        durationSeconds: 21.768,
        start: webAudioStart
      }
    });
    const webAudioBlob = new Blob(["audio"], { type: "audio/ogg" }) as Blob & {
      arrayBuffer: ReturnType<typeof vi.fn>;
    };
    webAudioBlob.arrayBuffer = vi.fn(async () => new ArrayBuffer(8));
    const webAudioSoundApiPort: SoundApiPort = {
      ...soundApiPortStub,
      getSoundAudioBlob: vi.fn(async () => webAudioBlob)
    };

    try {
      renderSoundsModeWorkspace({ soundApiPort: webAudioSoundApiPort });

      const playButton = await screen.findByRole("button", { name: /play amb_city_market_day/i });
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(webAudioSoundApiPort.getSoundAudioBlob).toHaveBeenCalledWith(
          "token",
          "cache_sound_abc"
        );
        expect(webAudioStart).toHaveBeenCalledTimes(2);
      });
      expect(htmlAudioPlay).not.toHaveBeenCalled();
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(screen.queryByText(/Browser playback needs a direct Play click/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();
      expect(playbackDoubles.webAudioSources[1]?.loop).toBe(true);
    } finally {
      playbackDoubles.restore();
    }
  });

  it("shows decoded browser preview duration separately from source duration after playback starts", async () => {
    const playbackDoubles = installSoundPlaybackTestDoubles({
      previewDurationSeconds: 9.9269375
    });

    try {
      renderSoundsModeWorkspace();

      const playButton = await screen.findByRole("button", { name: /play amb_city_market_day/i });
      fireEvent.click(playButton);

      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });

      expect(within(inspector).getByText("duration:")).toBeInTheDocument();
      expect(within(inspector).getByText("2.4s")).toBeInTheDocument();
      expect(within(inspector).getByText("preview duration:")).toBeInTheDocument();
      expect(within(inspector).getByText("9.9s (browser-preview)")).toBeInTheDocument();
      expect(within(inspector).getByText(/module \/ proxy \/ audio\/ogg \/ 512 B/i)).toBeInTheDocument();
      expect(within(inspector).getByText("source:")).toBeInTheDocument();
      expect(within(inspector).getByText("module")).toBeInTheDocument();
      expect(within(inspector).getByText("objectKey:")).toBeInTheDocument();
      expect(
        within(inspector).getByText("modules/current/audio/ambient/amb_city_market_day.ogg")
      ).toBeInTheDocument();
      expect(within(inspector).getByText("etag:")).toBeInTheDocument();
      expect(within(inspector).getByText("source-audio-etag-001")).toBeInTheDocument();
    } finally {
      playbackDoubles.restore();
    }
  });

  it("keeps loaded sound audio available when the browser blocks playback", async () => {
    const playSpy = vi.fn(async () => {
      throw new Error(
        "play() failed because the user didn't interact with the document first."
      );
    });
    const playbackDoubles = installSoundPlaybackTestDoubles({ play: playSpy });

    try {
      const { unmount } = renderSoundsModeWorkspace();

      const playButton = await screen.findByRole("button", { name: /play amb_city_market_day/i });
      fireEvent.click(playButton);

      expect(
        await screen.findAllByText(
          /Audio is loaded\. Browser playback needs a direct Play click\./i
        )
      ).not.toHaveLength(0);
      expect(playSpy).toHaveBeenCalledTimes(1);
      expect(playbackDoubles.audio.pause).not.toHaveBeenCalled();
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      expect(soundApiPortStub.processSound).toHaveBeenCalledTimes(1);
      expect(soundApiPortStub.getSoundAudioBlob).toHaveBeenCalledTimes(1);
      unmount();
    } finally {
      playbackDoubles.restore();
    }
  });

  it("shows a retry affordance when audio playback fails", async () => {
    const originalAudio = globalThis.Audio;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const audioInstances: SoundAudioTestDouble[] = [];
    globalThis.Audio = vi.fn(() => {
      const play = vi.fn();
      if (audioInstances.length === 0) {
        play.mockRejectedValueOnce(new Error("prepared audio playback failed"));
      } else {
        play.mockResolvedValue(undefined);
      }
      const audio: SoundAudioTestDouble = {
        play,
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        loop: false,
        onended: null,
        onerror: null
      };
      audioInstances.push(audio);
      return audio;
    }) as unknown as typeof Audio;
    let objectUrlIndex = 0;
    URL.createObjectURL = vi.fn(() => {
      objectUrlIndex += 1;
      return `blob:sound-preview-${objectUrlIndex}`;
    });
    URL.revokeObjectURL = vi.fn();

    try {
      renderSoundsModeWorkspace();

      const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
      const playButton = await within(soundsSection).findByRole("button", {
        name: /play amb_city_market_day/i
      });
      fireEvent.click(playButton);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Sound preview failed: prepared audio playback failed"
      );
      expect(within(inspector).getByText(/sound_ambient_city_market_001/i)).toBeInTheDocument();
      expect(
        within(inspector).getByText((_, element) => element?.textContent === "resref: amb_city_market_day")
      ).toBeInTheDocument();
      expect(
        within(inspector).getByText((_, element) => element?.textContent === "category: ambient")
      ).toBeInTheDocument();
      expect(
        within(inspector).getByText((_, element) => element?.textContent === "format: ogg")
      ).toBeInTheDocument();
      expect(within(inspector).getByText("Error")).toBeInTheDocument();
      expect(within(soundsSection).getByText("amb_city_market_day")).toBeInTheDocument();
      expectStatusRegionText(/state:\s*Error/i);
      const retryButton = screen.getByRole("button", { name: /play amb_city_market_day/i });
      expect(retryButton).toBeEnabled();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /place amb_city_market_day on canvas/i })).toBeNull();
      expectSoundAudioCleanup(audioInstances[0], {
        revokedUrl: "blob:sound-preview-1"
      });

      fireEvent.click(retryButton);

      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(within(inspector).getByText("Playing")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();
      expect(soundApiPortStub.processSound).toHaveBeenCalledTimes(2);
      expect(soundApiPortStub.getSoundAudioContracts).toHaveBeenCalledTimes(2);
      expect(soundApiPortStub.getSoundAudioBlob).toHaveBeenCalledTimes(2);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.Audio = originalAudio;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it("shows a controlled error and allows retry when prepared backend audio cannot be played", async () => {
    const originalAudio = globalThis.Audio;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const audioInstances: Array<{
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      removeAttribute: ReturnType<typeof vi.fn>;
      loop: boolean;
      onended: null | (() => void);
      onerror: null | (() => void);
    }> = [];
    globalThis.Audio = vi.fn(() => {
      const audio = {
        play: vi.fn(async () => undefined),
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        loop: false,
        onended: null,
        onerror: null
      };
      audioInstances.push(audio);
      return audio;
    }) as unknown as typeof Audio;
    let objectUrlIndex = 0;
    URL.createObjectURL = vi.fn(() => {
      objectUrlIndex += 1;
      return `blob:sound-preview-${objectUrlIndex}`;
    });
    URL.revokeObjectURL = vi.fn();

    try {
      const workspaceChromeFacade = createWorkspaceChromeFacade();
      const sceneViewportPort = createBrowserSceneViewportPort();
      const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
      const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

      render(
        <WorkspaceLayout
          role="builder"
          userId="u_builder_001"
          workspaceChromeFacade={workspaceChromeFacade}
          sceneViewportPort={sceneViewportPort}
          areaApiPort={areaApiPortStub}
          placeableApiPort={placeableApiPortStub}
          soundApiPort={soundApiPortStub}
          backendAccessToken={"token"}
          sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
          trackTelemetryEvent={vi.fn()}
          activeBuilderModeId="sounds_mode"
          toolbarState={toolbarState}
          commandSignal={null}
          workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
          leftCollapsed={false}
          rightCollapsed={false}
          onToggleLeftCollapsed={() => undefined}
          onToggleRightCollapsed={() => undefined}
        />
      );

      const playButton = await screen.findByRole("button", { name: /play amb_city_market_day/i });
      fireEvent.click(playButton);

      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();
      expect(audioInstances[0]?.onerror).toBeTypeOf("function");

      act(() => {
        audioInstances[0]?.onerror?.();
      });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Backend audio pipeline returned an audio payload that could not be played."
      );
      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
      expect(within(inspector).getByText(/sound_ambient_city_market_001/i)).toBeInTheDocument();
      expect(within(inspector).getByText("Error")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expectSoundAudioCleanup(audioInstances[0], {
        revokedUrl: "blob:sound-preview-1"
      });

      fireEvent.click(playButton);

      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();
      expect(soundApiPortStub.processSound).toHaveBeenCalledTimes(2);
      expect(soundApiPortStub.getSoundAudioContracts).toHaveBeenCalledTimes(2);
      expect(soundApiPortStub.getSoundAudioBlob).toHaveBeenCalledTimes(2);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.Audio = originalAudio;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it("keeps Play and Stop labels and status regions clear across busy, playing, and error states", async () => {
    const originalAudio = globalThis.Audio;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const audioInstances: Array<{
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      removeAttribute: ReturnType<typeof vi.fn>;
      loop: boolean;
      onended: null | (() => void);
      onerror: null | (() => void);
    }> = [];
    globalThis.Audio = vi.fn(() => {
      const audio = {
        play: vi.fn(async () => undefined),
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        loop: false,
        onended: null,
        onerror: null
      };
      audioInstances.push(audio);
      return audio;
    }) as unknown as typeof Audio;
    URL.createObjectURL = vi.fn(() => "blob:sound-preview");
    URL.revokeObjectURL = vi.fn();

    try {
      const processResult = await soundApiPortStub.processSound("token", soundListItem.soundId, {
        bypassCache: false
      });
      const processDeferred = createDeferred<typeof processResult>();
      const accessiblePort: SoundApiPort = {
        ...soundApiPortStub,
        processSound: vi.fn(async () => processDeferred.promise)
      };
      const workspaceChromeFacade = createWorkspaceChromeFacade();
      const sceneViewportPort = createBrowserSceneViewportPort();
      const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
      const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

      render(
        <WorkspaceLayout
          role="builder"
          userId="u_builder_001"
          workspaceChromeFacade={workspaceChromeFacade}
          sceneViewportPort={sceneViewportPort}
          areaApiPort={areaApiPortStub}
          placeableApiPort={placeableApiPortStub}
          soundApiPort={accessiblePort}
          backendAccessToken={"token"}
          sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
          trackTelemetryEvent={vi.fn()}
          activeBuilderModeId="sounds_mode"
          toolbarState={toolbarState}
          commandSignal={null}
          workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
          leftCollapsed={false}
          rightCollapsed={false}
          onToggleLeftCollapsed={() => undefined}
          onToggleRightCollapsed={() => undefined}
        />
      );

      const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
      const playButton = await within(soundsSection).findByRole("button", {
        name: /play amb_city_market_day/i
      });
      fireEvent.click(playButton);

      expect(playButton).toBeDisabled();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expect(await within(soundsSection).findByText(/Processing sound\./i)).toBeInTheDocument();
      expectStatusRegionText(/Processing sound\./i);
      expectStatusRegionText(/state:\s*Processing/i);
      expect(within(inspector).getByText("Processing")).toBeInTheDocument();
      expect(within(inspector).getByText(/sound_ambient_city_market_001/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /place amb_city_market_day on canvas/i })).toBeNull();

      processDeferred.resolve(processResult);

      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(playButton).toBeDisabled();
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();
      expectStatusRegionText(/Playing from backend audio cache/i);
      expectStatusRegionText(/state:\s*Playing/i);
      expect(within(inspector).getByText("Playing")).toBeInTheDocument();

      act(() => {
        audioInstances[0]?.onerror?.();
      });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Backend audio pipeline returned an audio payload that could not be played."
      );
      expect(playButton).not.toBeDisabled();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expectStatusRegionText(/state:\s*Error/i);
      expect(within(inspector).getByText("Error")).toBeInTheDocument();
      expect(within(inspector).getByText(/sound_ambient_city_market_001/i)).toBeInTheDocument();
    } finally {
      globalThis.Audio = originalAudio;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it("keeps the Play, Stop, and retry flow keyboard accessible", async () => {
    const playbackDoubles = installSoundPlaybackTestDoubles();

    try {
      renderSoundsModeWorkspace();

      const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
      const playButton = await within(soundsSection).findByRole("button", {
        name: /play amb_city_market_day/i
      });

      activateFocusedButtonFromKeyboard(playButton, "Enter");

      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(playbackDoubles.audio.play).toHaveBeenCalledTimes(1);
      expect(within(inspector).getByText(/sound_ambient_city_market_001/i)).toBeInTheDocument();
      expect(within(inspector).getByText("Playing")).toBeInTheDocument();

      const playingStopButton = screen.getByRole("button", { name: /stop amb_city_market_day/i });
      activateFocusedButtonFromKeyboard(playingStopButton, " ");

      expectSoundAudioCleanup(playbackDoubles.audio, {
        revokedUrl: "blob:sound-preview"
      });
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expect(playButton).not.toBeDisabled();

      activateFocusedButtonFromKeyboard(playButton, "Enter");

      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();
      expect(soundApiPortStub.processSound).toHaveBeenCalledTimes(2);
      expect(soundApiPortStub.getSoundAudioContracts).toHaveBeenCalledTimes(2);
      expect(soundApiPortStub.getSoundAudioBlob).toHaveBeenCalledTimes(2);
      expect(playbackDoubles.audio.play).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("button", { name: /place amb_city_market_day on canvas/i })).toBeNull();
    } finally {
      playbackDoubles.restore();
    }
  });

  it("keeps keyboard-selected sound metadata and playback state coherent when filters change", async () => {
    const playbackDoubles = installSoundPlaybackTestDoubles();
    const hakSound: SoundApiListItem = {
      ...soundListItem,
      soundId: "sound_port_1",
      resref: "port_1",
      name: "Port 1",
      category: "effect",
      source: {
        layer: "hak"
      },
      auroraUsage: {
        bindingKey: "GI_sound_pos",
        sourceField: "PlacedSound",
        defaultsTable: "sounddefaultspos"
      }
    };
    const twoSoundPort: SoundApiPort = {
      ...soundApiPortStub,
      listSounds: vi.fn(async () => ({
        items: [soundListItem, hakSound],
        total: 2,
        limit: 100,
        offset: 0
      }))
    };

    try {
      renderSoundsModeWorkspace({ soundApiPort: twoSoundPort });

      const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
      await within(soundsSection).findByText("2");
      activateFocusedButtonFromKeyboard(
        within(soundsSection).getByRole("button", { name: /^amb_city_market_day/i }),
        "Enter"
      );
      expect(within(inspector).getByText(/sound_ambient_city_market_001/i)).toBeInTheDocument();
      expect(within(inspector).getByText("module")).toBeInTheDocument();

      activateFocusedButtonFromKeyboard(
        within(soundsSection).getByRole("button", { name: /play amb_city_market_day/i }),
        "Enter"
      );
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();

      const sourceFilter = within(soundsSection).getByRole("group", {
        name: /sound source filter/i
      });
      activateFocusedButtonFromKeyboard(within(sourceFilter).getByRole("button", { name: /^hak$/i }), " ");

      expect(await within(soundsSection).findByText("1/2")).toBeInTheDocument();
      expect(within(soundsSection).getByText("port_1")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("amb_city_market_day")).not.toBeInTheDocument();
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expect(within(inspector).getByText("Select a sound to inspect its Aurora contract.")).toBeInTheDocument();
      expectSoundAudioCleanup(playbackDoubles.audio, {
        revokedUrl: "blob:sound-preview"
      });

      activateFocusedButtonFromKeyboard(
        within(soundsSection).getByRole("button", { name: /^port_1/i }),
        "Enter"
      );

      expect(within(inspector).getByText(/sound_port_1/i)).toBeInTheDocument();
      expect(within(inspector).getByText("hak")).toBeInTheDocument();
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /place port_1 on canvas/i })).toBeNull();

      activateFocusedButtonFromKeyboard(within(sourceFilter).getByRole("button", { name: /^all$/i }), "Enter");
      expect(await within(soundsSection).findByText("2")).toBeInTheDocument();
      activateFocusedButtonFromKeyboard(
        within(soundsSection).getByRole("button", { name: /play port_1/i }),
        "Enter"
      );
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(screen.getByRole("button", { name: /stop port_1/i })).toBeInTheDocument();

      const categoryFilter = within(soundsSection).getByRole("group", {
        name: /sound category filter/i
      });
      activateFocusedButtonFromKeyboard(
        within(categoryFilter).getByRole("button", { name: /^ambient$/i }),
        " "
      );

      expect(await within(soundsSection).findByText("1/2")).toBeInTheDocument();
      expect(within(soundsSection).getByText("amb_city_market_day")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("port_1")).not.toBeInTheDocument();
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop port_1/i })).not.toBeInTheDocument();
      expect(within(inspector).getByText("Select a sound to inspect its Aurora contract.")).toBeInTheDocument();
      expectSoundAudioCleanup(playbackDoubles.audio, {
        releaseCalls: 2,
        revokedCallCount: 2
      });

      activateFocusedButtonFromKeyboard(
        within(soundsSection).getByRole("button", { name: /^amb_city_market_day/i }),
        "Enter"
      );
      activateFocusedButtonFromKeyboard(
        within(soundsSection).getByRole("button", { name: /play amb_city_market_day/i }),
        "Enter"
      );
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();

      const searchInput = within(soundsSection).getByRole("searchbox", {
        name: /filter sounds/i
      });
      searchInput.focus();
      expect(searchInput).toHaveFocus();
      fireEvent.change(searchInput, { target: { value: "port" } });

      expect(searchInput).toHaveFocus();
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expect(within(inspector).getByText("Select a sound to inspect its Aurora contract.")).toBeInTheDocument();
      expectSoundAudioCleanup(playbackDoubles.audio, {
        releaseCalls: 3,
        revokedCallCount: 3
      });
    } finally {
      playbackDoubles.restore();
    }
  });

  it("clears active playback state and releases audio when sound filters or selection change", async () => {
    const originalAudio = globalThis.Audio;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const audioInstances: Array<{
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      removeAttribute: ReturnType<typeof vi.fn>;
      loop: boolean;
      onended: null | (() => void);
      onerror: null | (() => void);
    }> = [];
    globalThis.Audio = vi.fn(() => {
      const audio = {
        play: vi.fn(async () => undefined),
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        loop: false,
        onended: null,
        onerror: null
      };
      audioInstances.push(audio);
      return audio;
    }) as unknown as typeof Audio;
    let objectUrlIndex = 0;
    URL.createObjectURL = vi.fn(() => {
      objectUrlIndex += 1;
      return `blob:sound-preview-${objectUrlIndex}`;
    });
    URL.revokeObjectURL = vi.fn();

    const hakSound: SoundApiListItem = {
      ...soundListItem,
      soundId: "sound_port_1",
      resref: "port_1",
      name: "Port 1",
      category: "effect",
      source: {
        layer: "hak"
      },
      auroraUsage: {
        bindingKey: "GI_sound_pos",
        sourceField: "PlacedSound",
        defaultsTable: "sounddefaultspos"
      }
    };
    const twoSoundPort: SoundApiPort = {
      ...soundApiPortStub,
      listSounds: vi.fn(async () => ({
        items: [soundListItem, hakSound],
        total: 2,
        limit: 100,
        offset: 0
      }))
    };

    try {
      const workspaceChromeFacade = createWorkspaceChromeFacade();
      const sceneViewportPort = createBrowserSceneViewportPort();
      const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
      const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

      render(
        <WorkspaceLayout
          role="builder"
          userId="u_builder_001"
          workspaceChromeFacade={workspaceChromeFacade}
          sceneViewportPort={sceneViewportPort}
          areaApiPort={areaApiPortStub}
          placeableApiPort={placeableApiPortStub}
          soundApiPort={twoSoundPort}
          backendAccessToken={"token"}
          sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
          trackTelemetryEvent={vi.fn()}
          activeBuilderModeId="sounds_mode"
          toolbarState={toolbarState}
          commandSignal={null}
          workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
          leftCollapsed={false}
          rightCollapsed={false}
          onToggleLeftCollapsed={() => undefined}
          onToggleRightCollapsed={() => undefined}
        />
      );

      const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
      await within(soundsSection).findByText("2");
      fireEvent.click(within(soundsSection).getByRole("button", { name: /play amb_city_market_day/i }));

      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(within(inspector).getByText("Playing")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();

      const sourceFilter = within(soundsSection).getByRole("group", {
        name: /sound source filter/i
      });
      fireEvent.click(within(sourceFilter).getByRole("button", { name: /^hak$/i }));

      expect(await within(soundsSection).findByText("1/2")).toBeInTheDocument();
      expect(within(soundsSection).getByText("port_1")).toBeInTheDocument();
      expect(within(soundsSection).queryByText("amb_city_market_day")).not.toBeInTheDocument();
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expectSoundAudioCleanup(audioInstances[0], {
        revokedUrl: "blob:sound-preview-1"
      });

      fireEvent.click(within(sourceFilter).getByRole("button", { name: /^all$/i }));
      expect(await within(soundsSection).findByText("2")).toBeInTheDocument();
      fireEvent.click(within(soundsSection).getByRole("button", { name: /play amb_city_market_day/i }));
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);

      fireEvent.click(await within(soundsSection).findByText("port_1"));

      expect(within(inspector).getByText(/sound_port_1/i)).toBeInTheDocument();
      expect(within(inspector).getByText("hak")).toBeInTheDocument();
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sound-preview-2");
      expect(screen.queryByRole("button", { name: /place port_1 on canvas/i })).toBeNull();
    } finally {
      globalThis.Audio = originalAudio;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it("clears stale playback errors when selecting a different sound", async () => {
    const processSound = vi.fn(async () => {
      throw new Error("process failed");
    });
    const hakSound: SoundApiListItem = {
      ...soundListItem,
      soundId: "sound_port_1",
      resref: "port_1",
      name: "Port 1",
      category: "effect",
      source: {
        layer: "hak"
      },
      auroraUsage: {
        bindingKey: "GI_sound_pos",
        sourceField: "PlacedSound",
        defaultsTable: "sounddefaultspos"
      }
    };
    const failingPort: SoundApiPort = {
      ...soundApiPortStub,
      listSounds: vi.fn(async () => ({
        items: [soundListItem, hakSound],
        total: 2,
        limit: 100,
        offset: 0
      })),
      processSound
    };
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        soundApiPort={failingPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="sounds_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
    const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
    await within(soundsSection).findByText("2");
    fireEvent.click(within(soundsSection).getByRole("button", { name: /play amb_city_market_day/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sound preview failed: process failed"
    );
    expect(within(inspector).getByText("Error")).toBeInTheDocument();

    fireEvent.click(await within(soundsSection).findByText("port_1"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(within(inspector).getByText(/sound_port_1/i)).toBeInTheDocument();
    expect(within(inspector).getByText("hak")).toBeInTheDocument();
    expect(within(soundsSection).getByText("amb_city_market_day")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /place port_1 on canvas/i })).toBeNull();
  });

  it("stops catalog audio and releases its object URL when leaving Sounds Mode", async () => {
    const playbackDoubles = installSoundPlaybackTestDoubles();

    try {
      const workspaceChromeFacade = createWorkspaceChromeFacade();
      const sceneViewportPort = createBrowserSceneViewportPort();
      const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
      const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
      const renderLayout = (activeBuilderModeId: "areas_mode" | "sounds_mode") => (
        <WorkspaceLayout
          role="builder"
          userId="u_builder_001"
          workspaceChromeFacade={workspaceChromeFacade}
          sceneViewportPort={sceneViewportPort}
          areaApiPort={areaApiPortStub}
          placeableApiPort={placeableApiPortStub}
          soundApiPort={soundApiPortStub}
          backendAccessToken={"token"}
          sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
          trackTelemetryEvent={vi.fn()}
          activeBuilderModeId={activeBuilderModeId}
          toolbarState={toolbarState}
          commandSignal={null}
          workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
          leftCollapsed={false}
          rightCollapsed={false}
          onToggleLeftCollapsed={() => undefined}
          onToggleRightCollapsed={() => undefined}
        />
      );

      const { rerender } = render(renderLayout("sounds_mode"));
      const playButton = await screen.findByRole("button", { name: /play amb_city_market_day/i });
      fireEvent.click(playButton);
      expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
      expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();

      rerender(renderLayout("areas_mode"));

      await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sound-preview"));
      expectSoundAudioCleanup(playbackDoubles.audio);
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop amb_city_market_day/i })).not.toBeInTheDocument();
    } finally {
      playbackDoubles.restore();
    }
  });

  it("stops playing catalog audio and releases its object URL on unmount", async () => {
    const playSpy = vi.fn(async () => undefined);
    const playbackDoubles = installSoundPlaybackTestDoubles({ play: playSpy });

    try {
      const { unmount } = renderSoundsModeWorkspace();

      const playButton = await screen.findByRole("button", { name: /play amb_city_market_day/i });
      fireEvent.click(playButton);
      await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1));

      unmount();

      expectSoundAudioCleanup(playbackDoubles.audio, {
        revokedUrl: "blob:sound-preview"
      });
    } finally {
      playbackDoubles.restore();
    }
  });

  it.each([
    {
      stage: "process",
      busyLabel: "Processing",
      busyMessage: /Processing sound\./i
    },
    {
      stage: "contracts",
      busyLabel: "Resolving",
      busyMessage: /Resolving audio contract\./i
    },
    {
      stage: "blob",
      busyLabel: "Loading",
      busyMessage: /Loading audio\./i
    }
  ] as const)(
    "disables Play and shows busy state while $stage is pending",
    async ({ stage, busyLabel, busyMessage }) => {
      const originalAudio = globalThis.Audio;
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      globalThis.Audio = vi.fn(() => ({
        play: vi.fn(async () => undefined),
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        loop: false,
        onended: null,
        onerror: null
      })) as unknown as typeof Audio;
      URL.createObjectURL = vi.fn(() => "blob:sound-preview");
      URL.revokeObjectURL = vi.fn();

      const processResult = await soundApiPortStub.processSound("token", soundListItem.soundId, {
        bypassCache: false
      });
      const contractsResult = await soundApiPortStub.getSoundAudioContracts(
        "token",
        "cache_sound_abc",
        "proxy"
      );
      const processDeferred = createDeferred<typeof processResult>();
      const contractsDeferred = createDeferred<typeof contractsResult>();
      const blobDeferred = createDeferred<Blob>();
      const processSound = vi.fn(async () =>
        stage === "process" ? processDeferred.promise : processResult
      );
      const getSoundAudioContracts = vi.fn(async () =>
        stage === "contracts" ? contractsDeferred.promise : contractsResult
      );
      const getSoundAudioBlob = vi.fn(async () =>
        stage === "blob" ? blobDeferred.promise : new Blob(["audio"], { type: "audio/ogg" })
      );
      const pendingPort: SoundApiPort = {
        ...soundApiPortStub,
        processSound,
        getSoundAudioContracts,
        getSoundAudioBlob
      };

      try {
        const workspaceChromeFacade = createWorkspaceChromeFacade();
        const sceneViewportPort = createBrowserSceneViewportPort();
        const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
        const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

        render(
          <WorkspaceLayout
            role="builder"
            userId="u_builder_001"
            workspaceChromeFacade={workspaceChromeFacade}
            sceneViewportPort={sceneViewportPort}
            areaApiPort={areaApiPortStub}
            placeableApiPort={placeableApiPortStub}
            soundApiPort={pendingPort}
            backendAccessToken={"token"}
            sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
            trackTelemetryEvent={vi.fn()}
            activeBuilderModeId="sounds_mode"
            toolbarState={toolbarState}
            commandSignal={null}
            workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
            leftCollapsed={false}
            rightCollapsed={false}
            onToggleLeftCollapsed={() => undefined}
            onToggleRightCollapsed={() => undefined}
          />
        );

        const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
        const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
        const playButton = await within(soundsSection).findByRole("button", {
          name: /play amb_city_market_day/i
        });
        fireEvent.click(playButton);

        expect(await within(soundsSection).findByText(busyMessage)).toBeInTheDocument();
        expect(within(soundsSection).getByText(busyLabel)).toBeInTheDocument();
        expect(within(inspector).getByText(busyLabel)).toBeInTheDocument();
        expect(playButton).toBeDisabled();
        expect(within(soundsSection).getByText("amb_city_market_day")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /place amb_city_market_day on canvas/i })).toBeNull();

        if (stage === "process") {
          processDeferred.resolve(processResult);
        }
        if (stage === "contracts") {
          await waitFor(() => expect(getSoundAudioContracts).toHaveBeenCalledTimes(1));
          contractsDeferred.resolve(contractsResult);
        }
        if (stage === "blob") {
          await waitFor(() => expect(getSoundAudioBlob).toHaveBeenCalledTimes(1));
          blobDeferred.resolve(new Blob(["audio"], { type: "audio/ogg" }));
        }

        expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
        expect(within(inspector).getByText("Playing")).toBeInTheDocument();
      } finally {
        globalThis.Audio = originalAudio;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
      }
    }
  );

  it("does not leak stale pending playback state after selecting a different sound", async () => {
    const originalAudio = globalThis.Audio;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    globalThis.Audio = vi.fn(() => ({
      play: vi.fn(async () => undefined),
      pause: vi.fn(),
      load: vi.fn(),
      removeAttribute: vi.fn(),
      loop: false,
      onended: null,
      onerror: null
    })) as unknown as typeof Audio;
    URL.createObjectURL = vi.fn(() => "blob:sound-preview");
    URL.revokeObjectURL = vi.fn();
    const processResult = await soundApiPortStub.processSound("token", soundListItem.soundId, {
      bypassCache: false
    });
    const processDeferred = createDeferred<typeof processResult>();
    const hakSound: SoundApiListItem = {
      ...soundListItem,
      soundId: "sound_port_1",
      resref: "port_1",
      name: "Port 1",
      category: "effect",
      source: {
        layer: "hak"
      },
      auroraUsage: {
        bindingKey: "GI_sound_pos",
        sourceField: "PlacedSound",
        defaultsTable: "sounddefaultspos"
      }
    };
    const getSoundAudioContracts = vi.fn(soundApiPortStub.getSoundAudioContracts);
    const getSoundAudioBlob = vi.fn(soundApiPortStub.getSoundAudioBlob);
    const pendingPort: SoundApiPort = {
      ...soundApiPortStub,
      listSounds: vi.fn(async () => ({
        items: [soundListItem, hakSound],
        total: 2,
        limit: 100,
        offset: 0
      })),
      processSound: vi.fn(async () => processDeferred.promise),
      getSoundAudioContracts,
      getSoundAudioBlob
    };

    try {
      const workspaceChromeFacade = createWorkspaceChromeFacade();
      const sceneViewportPort = createBrowserSceneViewportPort();
      const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
      const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

      render(
        <WorkspaceLayout
          role="builder"
          userId="u_builder_001"
          workspaceChromeFacade={workspaceChromeFacade}
          sceneViewportPort={sceneViewportPort}
          areaApiPort={areaApiPortStub}
          placeableApiPort={placeableApiPortStub}
          soundApiPort={pendingPort}
          backendAccessToken={"token"}
          sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
          trackTelemetryEvent={vi.fn()}
          activeBuilderModeId="sounds_mode"
          toolbarState={toolbarState}
          commandSignal={null}
          workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
          leftCollapsed={false}
          rightCollapsed={false}
          onToggleLeftCollapsed={() => undefined}
          onToggleRightCollapsed={() => undefined}
        />
      );

      const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
      const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
      await within(soundsSection).findByText("2");
      fireEvent.click(within(soundsSection).getByRole("button", { name: /play amb_city_market_day/i }));
      expect(await within(soundsSection).findByText(/Processing sound\./i)).toBeInTheDocument();

      fireEvent.click(await within(soundsSection).findByText("port_1"));

      expect(within(inspector).getByText(/sound_port_1/i)).toBeInTheDocument();
      expect(screen.queryByText("Processing")).not.toBeInTheDocument();
      processDeferred.resolve(processResult);
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      expect(getSoundAudioContracts).not.toHaveBeenCalled();
      expect(getSoundAudioBlob).not.toHaveBeenCalled();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(screen.queryByText("Playing")).not.toBeInTheDocument();
      expect(within(inspector).getByText(/sound_port_1/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /place port_1 on canvas/i })).toBeNull();
    } finally {
      globalThis.Audio = originalAudio;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it.each([
    { stage: "process", message: "process failed" },
    { stage: "contracts", message: "contracts failed" },
    { stage: "blob", message: "audio blob failed" }
  ] as const)(
    "keeps Sounds Mode usable and retryable after $stage playback pipeline failure",
    async ({ stage, message }) => {
      const originalAudio = globalThis.Audio;
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      const playSpy = vi.fn(async () => undefined);
      globalThis.Audio = vi.fn(() => ({
        play: playSpy,
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        loop: false,
        onended: null,
        onerror: null
      })) as unknown as typeof Audio;
      URL.createObjectURL = vi.fn(() => "blob:sound-preview");
      URL.revokeObjectURL = vi.fn();

      const processSound = vi.fn(async () => ({
        cacheKey: "cache_sound_abc",
        cacheHit: false,
        storedAt: "2026-06-16T10:00:00.000Z",
        hits: 0,
        sound: {
          ...soundListItem,
          audio: {
            assetId: "asset_sound_001",
            cacheKey: "audio/ambient/amb_city_market_day:sound_ambient_city_market_001",
            strategy: "blob-cache" as const,
            objectKey: "modules/current/audio/ambient/amb_city_market_day.ogg",
            contentType: "audio/ogg",
            sizeBytes: 512,
            format: "ogg" as const,
            sampleRateHz: 44100,
            channels: 2 as const
          },
          spatial: {
            mode: "2d" as const,
            loop: true
          },
          playback: {
            mode: "looping" as const,
            ambientOnly: true
          },
          render: {
            backendType: "sound" as const,
            frontendType: "sound" as const,
            playbackPreset: "ambient-loop" as const
          },
          processedAt: "2026-06-16T10:00:01.000Z"
        }
      }));
      const getSoundAudioContracts = vi.fn(async () => ({
        cacheKey: "cache_sound_abc",
        audio: {
          mode: "proxy" as const,
          assetId: "asset_sound_001",
          objectKey: "modules/current/audio/ambient/amb_city_market_day.ogg",
          contentType: "audio/ogg",
          sizeBytes: 512,
          proxyPath: "/api/v1/catalog/sounds/cache/cache_sound_abc/audio",
          proxyUrl: "/api/v1/catalog/sounds/cache/cache_sound_abc/audio"
        }
      }));
      const getSoundAudioBlob = vi.fn(async () => new Blob(["audio"], { type: "audio/ogg" }));

      if (stage === "process") {
        processSound.mockRejectedValueOnce(new Error(message));
      }
      if (stage === "contracts") {
        getSoundAudioContracts.mockRejectedValueOnce(new Error(message));
      }
      if (stage === "blob") {
        getSoundAudioBlob.mockRejectedValueOnce(new Error(message));
      }

      const failingThenRecoveringPort: SoundApiPort = {
        ...soundApiPortStub,
        processSound,
        getSoundAudioContracts,
        getSoundAudioBlob
      };

      try {
        const workspaceChromeFacade = createWorkspaceChromeFacade();
        const sceneViewportPort = createBrowserSceneViewportPort();
        const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
        const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

        render(
          <WorkspaceLayout
            role="builder"
            userId="u_builder_001"
            workspaceChromeFacade={workspaceChromeFacade}
            sceneViewportPort={sceneViewportPort}
            areaApiPort={areaApiPortStub}
            placeableApiPort={placeableApiPortStub}
            soundApiPort={failingThenRecoveringPort}
            backendAccessToken={"token"}
            sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
            trackTelemetryEvent={vi.fn()}
            activeBuilderModeId="sounds_mode"
            toolbarState={toolbarState}
            commandSignal={null}
            workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
            leftCollapsed={false}
            rightCollapsed={false}
            onToggleLeftCollapsed={() => undefined}
            onToggleRightCollapsed={() => undefined}
          />
        );

        const playButton = await screen.findByRole("button", {
          name: /play amb_city_market_day/i
        });
        fireEvent.click(playButton);

        expect(await screen.findByRole("alert")).toHaveTextContent(
          `Sound preview failed: ${message}`
        );
        const inspector = screen.getByRole("article", { name: /sounds mode inspector/i });
        const soundsSection = screen.getByRole("article", { name: /sounds mode section/i });
        expect(within(inspector).getByText(/sound_ambient_city_market_001/i)).toBeInTheDocument();
        expect(
          within(inspector).getByText((_, element) => element?.textContent === "resref: amb_city_market_day")
        ).toBeInTheDocument();
        expect(
          within(inspector).getByText((_, element) => element?.textContent === "category: ambient")
        ).toBeInTheDocument();
        expect(
          within(inspector).getByText((_, element) => element?.textContent === "format: ogg")
        ).toBeInTheDocument();
        expect(within(inspector).getByText("Error")).toBeInTheDocument();
        expect(within(soundsSection).getByText("amb_city_market_day")).toBeInTheDocument();
        expectStatusRegionText(/state:\s*Error/i);
        const retryButton = screen.getByRole("button", { name: /play amb_city_market_day/i });
        expect(retryButton).toBeInTheDocument();
        expect(retryButton).toBeEnabled();
        expect(screen.queryByRole("button", { name: /place amb_city_market_day on canvas/i })).toBeNull();
        expect(playSpy).not.toHaveBeenCalled();

        fireEvent.click(retryButton);

        expect(await screen.findAllByText(/Playing from backend audio cache/i)).not.toHaveLength(0);
        expect(within(inspector).getByText("Playing")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /stop amb_city_market_day/i })).toBeInTheDocument();
        expect(playSpy).toHaveBeenCalledTimes(1);

        expect(processSound).toHaveBeenCalledTimes(2);
        expect(getSoundAudioContracts).toHaveBeenCalledTimes(stage === "process" ? 1 : 2);
        expect(getSoundAudioBlob).toHaveBeenCalledTimes(stage === "blob" ? 2 : 1);
      } finally {
        globalThis.Audio = originalAudio;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
      }
    }
  );

  it("passes isolated preview toolbar and option state to viewport in placeables mode", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    toolbarState.visibility.creatures = true;
    toolbarState.visibility.doors = true;
    toolbarState.visibility.placeables = false;
    toolbarState.canvasDebug.grid = false;
    toolbarState.canvasDebug.axes = false;
    toolbarState.canvasDebug.bounds = true;
    toolbarState.canvasDebug.wireframe = true;
    toolbarState.canvasDebug.statusMap = "all";
    toolbarState.canvasDebug.textureCompression = "uastc";
    toolbarState.canvasDebug.snapGrid = true;
    toolbarState.canvasDebug.snapAngle = true;
    toolbarState.canvasDebug.snapHeight = true;
    toolbarState.canvasDebug.objectLabels = true;
    toolbarState.canvasDebug.controlsHint = true;
    toolbarState.canvasDebug.runtimeHud = true;
    const inheritedWorkspaceOptions = {
      ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
      snapGridStep: 7,
      snapAngleStepDeg: 90,
      showPerObjectGizmoHints: true,
      showTileGridOverlay: true,
      enableRuntimeSoundPreview: true,
      showRuntimeSoundNowPlaying: true
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={inheritedWorkspaceOptions}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const lastViewportCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const viewportProps = lastViewportCall?.[0] as {
      toolbarState: ReturnType<typeof workspaceChromeFacade.createDefaultToolbarState>;
      workspaceOptions: typeof DEFAULT_WORKSPACE_OPTION_SETTINGS;
      showGizmoModeBadge?: boolean;
    };

    expect(viewportProps.toolbarState.visibility).toEqual({
      creatures: false,
      doors: false,
      encounters: false,
      items: false,
      merchants: false,
      placeables: true,
      sounds: false,
      stores: false,
      triggers: false,
      waypoints: false,
      start_location: false
    });
    expect(viewportProps.toolbarState.selectionScope).toBe("placeables");
    expect(viewportProps.toolbarState.canvasDebug).toEqual(
      expect.objectContaining({
        grid: true,
        axes: true,
        textures: true,
        wireframe: false,
        bounds: false,
        statusMap: "off",
        textureCompression: "none",
        snapGrid: false,
        snapAngle: false,
        snapHeight: false,
        objectLabels: false,
        controlsHint: false,
        runtimeHud: false,
        perfHud: false
      })
    );
    expect(viewportProps.workspaceOptions).toEqual(
      expect.objectContaining({
        snapGridStep: DEFAULT_WORKSPACE_OPTION_SETTINGS.snapGridStep,
        snapAngleStepDeg: DEFAULT_WORKSPACE_OPTION_SETTINGS.snapAngleStepDeg,
        showPerObjectGizmoHints: false,
        showTileGridOverlay: false,
        enableRuntimeSoundPreview: false,
        showRuntimeSoundNowPlaying: false
      })
    );
    expect(viewportProps.showGizmoModeBadge).toBe(false);
    expect(await screen.findByRole("button", { name: /plc_barrel_01/i })).toBeInTheDocument();
  });

  it("loads placeables catalog from backend with deterministic first page query in placeables mode", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(placeableApiPortStub.listPlaceables).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));

    await screen.findByRole("button", { name: /plc_barrel_01/i });
    await waitFor(() => {
      expect(placeableApiPortStub.listPlaceables).toHaveBeenCalledTimes(1);
    });
    expect(placeableApiPortStub.listPlaceables).toHaveBeenCalledWith("token", {
      limit: 1000,
      offset: 0
    });
  });

  it("surfaces backend status when placeables catalog loading fails", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const unauthorizedError = Object.assign(new Error("Unauthorized"), {
      status: 401,
      code: "INVALID_SESSION"
    });
    const failingPlaceableApiPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => {
        throw unauthorizedError;
      })
    };
    const onBackendSessionInvalidated = vi.fn();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={failingPlaceableApiPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
        onBackendSessionInvalidated={onBackendSessionInvalidated}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load placeables from backend (401 INVALID_SESSION)."
    );
    expect(onBackendSessionInvalidated).toHaveBeenCalledWith("placeables_catalog", "token");
  });

  it("opens URL-selected plc_zlc_o45 Magic Mouth as a VFX placeables catalog query", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const vfxPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_zlc_o45",
            resref: "zlc_o45",
            name: "VFX: Magic Mouth",
            category: "effects",
            placeableSubtype: "vfx" as const,
            tags: ["vfx", "magic-mouth"],
            previewImageUrl: "/preview/plc_zlc_o45.png"
          }
        ],
        total: 1,
        limit: 1000,
        offset: 0
      }))
    };

    window.history.replaceState(
      {},
      "",
      "/app?placeable=plc_zlc_o45&subtype=vfx"
    );
    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={vfxPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const placeablesList = await screen.findByRole("list", {
      name: /placeables mode list/i
    });
    expect(screen.getByRole("searchbox", { name: /filter placeables/i })).toHaveValue(
      "plc_zlc_o45"
    );
    expect(within(placeablesList).getByRole("button", { name: /VFX: Magic Mouth/i }))
      .toBeInTheDocument();
    await waitFor(() => {
      expect(vfxPort.listPlaceables).toHaveBeenCalledWith("token", {
        limit: 1000,
        offset: 0,
        query: "plc_zlc_o45",
        subtype: "vfx"
      });
    });
  });

  it("ignores the legacy Magic Mouth demo route when initializing placeables mode", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const listPlaceables = vi.fn(placeableApiPortStub.listPlaceables);
    const placeableApiPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables
    };

    window.history.replaceState({}, "", "/app?demo=plc_zlc_o45_magic_mouth");
    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("list", { name: /placeables mode list/i });
    expect(screen.getByRole("searchbox", { name: /filter placeables/i })).toHaveValue("");
    expect(screen.getByRole("button", { name: /all/i })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(listPlaceables).toHaveBeenCalledWith("token", {
        limit: 1000,
        offset: 0
      });
    });
  });

  it("reuses cached placeables catalog when returning to placeables mode", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    await screen.findByRole("button", { name: /plc_barrel_01/i });
    await waitFor(() => {
      expect(placeableApiPortStub.listPlaceables).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /areas mode/i }));
    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));

    await screen.findByRole("button", { name: /plc_barrel_01/i });
    expect(placeableApiPortStub.listPlaceables).toHaveBeenCalledTimes(1);
  });

  it("reuses cached area list when returning from placeables mode", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const cachedAreaPort: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_alpha",
            name: "Area Alpha",
            biome: "urban",
            width: 3,
            height: 3,
            tags: [],
            benchmark: false,
            updatedAt: "2026-01-01T00:00:00.000Z"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={cachedAreaPort}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area alpha/i });
    expect(cachedAreaPort.listAreas).toHaveBeenCalledWith("token", {
      limit: 100,
      offset: 0
    });
    await waitFor(() => {
      expect(cachedAreaPort.listAreas).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    await screen.findByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(screen.getByRole("button", { name: /areas mode/i }));

    await screen.findByRole("button", { name: /area alpha/i });
    expect(cachedAreaPort.listAreas).toHaveBeenCalledTimes(1);
  });

  it("renders areas progressively while later area batches are still loading", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    let resolveSecondAreaBatch:
      | ((value: Awaited<ReturnType<AreaApiPort["listAreas"]>>) => void)
      | null = null;
    const secondAreaBatch = new Promise<Awaited<ReturnType<AreaApiPort["listAreas"]>>>(
      (resolve) => {
        resolveSecondAreaBatch = resolve;
      }
    );
    const progressiveAreaPort: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async (_token: string, query) => {
        const offset = query?.offset ?? 0;
        if (offset === 0) {
          return {
            items: [
              buildAreaListItemFixture({
                areaId: "area_alpha",
                name: "Area Alpha",
                biome: "urban",
                width: 3,
                height: 3,
                tags: [],
                benchmark: false,
                objectCounts: {
                  placeables: 2,
                  doors: 1,
                  creatures: 0,
                  items: 0,
                  sounds: 1,
                  total: 4
                },
                updatedAt: "2026-01-01T00:00:00.000Z"
              })
            ],
            total: 2,
            limit: query?.limit ?? 100,
            offset
          };
        }
        return secondAreaBatch;
      })
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={progressiveAreaPort}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /area alpha/i });
    expect(screen.queryByRole("button", { name: /area beta/i })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(progressiveAreaPort.listAreas).toHaveBeenCalledWith("token", {
        limit: 100,
        offset: 1
      });
    });

    resolveSecondAreaBatch?.({
      items: [
        buildAreaListItemFixture({
          areaId: "area_beta",
          name: "Area Beta",
          biome: "forest",
          width: 4,
          height: 4,
          tags: [],
          benchmark: false,
          updatedAt: "2026-01-01T00:00:00.000Z"
        })
      ],
      total: 2,
      limit: 100,
      offset: 1
    });

    await screen.findByRole("button", { name: /area beta/i });
    expect(screen.getByText("urban | 3x3 | 4 objects")).toBeInTheDocument();
    expect(screen.getByText("2 placeables, 1 door, 1 sound")).toBeInTheDocument();
  });

  it("bounds progressively loaded area rows and thumbnails until Show more is requested", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const manyAreaItems = Array.from({ length: 101 }, (_, index) =>
      buildAreaListItemFixture({
        areaId: `area_catalog_${String(index + 1).padStart(3, "0")}`,
        name: `Area Catalog ${String(index + 1).padStart(3, "0")}`,
        previewImageUrl: `/assets/previews/areas/area_catalog_${index + 1}.webp`
      })
    );
    const manyAreaPort: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: manyAreaItems,
        total: manyAreaItems.length,
        limit: 100,
        offset: 0
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={manyAreaPort}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const areaList = await screen.findByRole("list", { name: /area list/i });
    await waitFor(() => {
      expect(within(areaList).getAllByRole("listitem")).toHaveLength(100);
    });
    expect(
      within(areaList).queryByRole("button", { name: /area catalog 101/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show more areas/i }));

    expect(within(areaList).getAllByRole("listitem")).toHaveLength(101);
    expect(
      within(areaList).getByRole("button", { name: /area catalog 101/i })
    ).toBeInTheDocument();
  });

  it("renders placeables progressively while later catalog batches are still loading", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    let resolveSecondBatch:
      | ((value: Awaited<ReturnType<PlaceableApiPort["listPlaceables"]>>) => void)
      | null = null;
    const secondBatch = new Promise<Awaited<ReturnType<PlaceableApiPort["listPlaceables"]>>>(
      (resolve) => {
        resolveSecondBatch = resolve;
      }
    );
    const progressivePort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async (_token: string, query) => {
        const offset = query?.offset ?? 0;
        if (offset === 0) {
          return {
            items: [
              {
                templateId: "plc_batch_a",
                resref: "plc_batch_a",
                name: "PLC_BATCH_A",
                category: "placeables",
                placeableSubtype: "generic" as const,
                tags: ["batch"],
                previewImageUrl: "/preview/plc_batch_a.png"
              }
            ],
            total: 2,
            limit: query?.limit ?? 100,
            offset
          };
        }
        return secondBatch;
      })
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={progressivePort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    await screen.findByRole("button", { name: /plc_batch_a/i });
    expect(screen.queryByRole("button", { name: /plc_batch_b/i })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(progressivePort.listPlaceables).toHaveBeenCalledWith("token", {
        limit: 1000,
        offset: 1
      });
    });

    resolveSecondBatch?.({
      items: [
        {
          templateId: "plc_batch_b",
          resref: "plc_batch_b",
          name: "PLC_BATCH_B",
          category: "placeables",
          placeableSubtype: "generic" as const,
          tags: ["batch"],
          previewImageUrl: "/preview/plc_batch_b.png"
        }
      ],
      total: 2,
      limit: 100,
      offset: 1
    });

    await screen.findByRole("button", { name: /plc_batch_b/i });
  });

  it("continues paging when backend pages are smaller than requested limit", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    const pagedPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async (_token: string, query) => {
        const offset = query?.offset ?? 0;
        const pages = [
          {
            templateId: "plc_page_a",
            resref: "plc_page_a",
            name: "PLC_PAGE_A",
            category: "placeables",
            placeableSubtype: "generic" as const,
            tags: ["page"],
            previewImageUrl: "/preview/plc_page_a.png"
          },
          {
            templateId: "plc_page_b",
            resref: "plc_page_b",
            name: "PLC_PAGE_B",
            category: "placeables",
            placeableSubtype: "generic" as const,
            tags: ["page"],
            previewImageUrl: "/preview/plc_page_b.png"
          },
          {
            templateId: "plc_page_c",
            resref: "plc_page_c",
            name: "PLC_PAGE_C",
            category: "placeables",
            placeableSubtype: "generic" as const,
            tags: ["page"],
            previewImageUrl: "/preview/plc_page_c.png"
          }
        ];
        const item = pages[offset];
        return {
          items: item ? [item] : [],
          total: pages.length,
          limit: query?.limit ?? 100,
          offset
        };
      })
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={pagedPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    const placeablesList = await screen.findByRole("list", { name: /placeables mode list/i });

    await waitFor(() => {
      expect(within(placeablesList).getAllByRole("button")).toHaveLength(3);
    });
    expect(within(placeablesList).getByRole("button", { name: /plc_page_a/i })).toBeInTheDocument();
    expect(within(placeablesList).getByRole("button", { name: /plc_page_b/i })).toBeInTheDocument();
    expect(within(placeablesList).getByRole("button", { name: /plc_page_c/i })).toBeInTheDocument();

    expect(pagedPort.listPlaceables).toHaveBeenCalledWith("token", { limit: 1000, offset: 0 });
    expect(pagedPort.listPlaceables).toHaveBeenCalledWith("token", { limit: 1000, offset: 1 });
    expect(pagedPort.listPlaceables).toHaveBeenCalledWith("token", { limit: 1000, offset: 2 });
  });

  it("starts the placeables preview from the first loaded page while the catalog keeps paging", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const pendingSecondPage = new Promise<
      Awaited<ReturnType<PlaceableApiPort["listPlaceables"]>>
    >(() => undefined);
    const processPlaceable = vi.fn(async (_accessToken: string, payload: { templateId?: string }) => {
      const templateId = payload.templateId ?? "plc_page_a";
      return {
        cacheKey: `cache_key_${templateId}`,
        cacheHit: true,
        storedAt: "2026-06-06T00:00:00.000Z",
        hits: 1,
        placeable: {
          templateId,
          resref: templateId,
          name: templateId.toUpperCase(),
          category: "placeables",
          placeableSubtype: "generic" as const,
          render: {
            backendType: "generic" as const,
            frontendType: "placeable" as const,
            rendererPreset: "default",
            isDoor: false,
            isVfx: false
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-06-06T00:00:00.000Z",
            assetCount: 0,
            candidatesScanned: 0,
            assets: []
          }
        }
      };
    });
    const pagedPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async (_accessToken, query) => {
        const offset = query?.offset ?? 0;
        if (offset > 0) {
          return pendingSecondPage;
        }
        return {
          items: [
            {
              templateId: "plc_page_a",
              resref: "plc_page_a",
              name: "PLC_PAGE_A",
              category: "placeables",
              placeableSubtype: "generic" as const,
              tags: ["page"],
              previewImageUrl: "/preview/plc_page_a.png"
            }
          ],
          total: 2,
          limit: query?.limit ?? 100,
          offset
        };
      }),
      processPlaceable,
      getPlaceableAssetContracts: vi.fn(async () => ({
        cacheKey: "cache_key_plc_page_a",
        assets: []
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={pagedPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /plc_page_a/i });
    await waitFor(() => {
      expect(processPlaceable).toHaveBeenCalledWith(
        "token",
        {
          templateId: "plc_page_a",
          resref: "plc_page_a",
          includeBenchmarkMetadata: false
        },
        { signal: expect.any(AbortSignal) }
      );
    });
    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const lastViewportProps = (lastViewportCall?.[0] ?? {}) as {
        externalSceneSeed?: { sceneId?: string } | null;
        placeableRenderPayloadByObjectId?: Record<string, { templateId: string }> | null;
      };
      expect(lastViewportProps.externalSceneSeed?.sceneId).toBe("preview:plc_page_a");
      expect(lastViewportProps.placeableRenderPayloadByObjectId).toEqual(
        expect.objectContaining({
          ["preview:plc_page_a"]: expect.objectContaining({
            templateId: "plc_page_a"
          })
        })
      );
    });
  });

  it("filters placeables by template id when resref omits the plc prefix", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    const prefixedTemplatePort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_zep_tomest_001",
            resref: "zep_tomest_001",
            name: "Ksiega na mrocznym stojaku",
            category: "placeables",
            placeableSubtype: "generic" as const,
            tags: ["zep"],
            previewImageUrl: "/preview/plc_zep_tomest_001.png"
          },
          {
            templateId: "plc_ptm_lantern03",
            resref: "ptm_lantern03",
            name: "Lantern - Elven",
            category: "placeables",
            placeableSubtype: "generic" as const,
            tags: ["vanilla"],
            previewImageUrl: "/preview/plc_ptm_lantern03.png"
          }
        ],
        total: 2,
        limit: 100,
        offset: 0
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={prefixedTemplatePort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    const placeablesList = await screen.findByRole("list", { name: /placeables mode list/i });
    await within(placeablesList).findByRole("button", { name: /plc_zep_tomest_001/i });

    fireEvent.change(screen.getByRole("searchbox", { name: /filter placeables/i }), {
      target: { value: "plc_zep_tomest_001" }
    });

    await waitFor(() => {
      expect(screen.getByText("1/2")).toBeInTheDocument();
      expect(
        within(placeablesList).getByRole("button", { name: /plc_zep_tomest_001/i })
      ).toBeInTheDocument();
      expect(
        within(placeablesList).queryByRole("button", { name: /plc_ptm_lantern03/i })
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /reset placeables filters/i }));

    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: /filter placeables/i })).toHaveValue("");
      const typeGroup = screen.getByRole("group", { name: /placeable type filter/i });
      expect(within(typeGroup).getByRole("button", { name: "All" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
    const resetPlaceablesList = await screen.findByRole("list", { name: /placeables mode list/i });
    expect(
      within(resetPlaceablesList).getByRole("button", { name: /plc_ptm_lantern03/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reset placeables filters/i })
    ).not.toBeInTheDocument();
  });

  it("passes a single placeable renderObjectId in placeables mode and updates it after click", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const initialLastCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const initialProps = initialLastCall?.[0] as {
      renderObjectIds?: string[] | null;
    };
    expect(initialProps.renderObjectIds ?? null).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));

    await screen.findByRole("button", { name: /plc_table_02/i });
    await waitFor(() => {
      const placeablesLastCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const placeablesPropsBeforeSelect = placeablesLastCall?.[0] as {
        renderObjectIds?: string[] | null;
      };
      const initialRenderIds = placeablesPropsBeforeSelect.renderObjectIds ?? [];
      expect(Array.isArray(initialRenderIds)).toBe(true);
      expect(initialRenderIds).toHaveLength(1);
    });

    const placeablesLastCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const placeablesPropsBeforeSelect = placeablesLastCall?.[0] as {
      renderObjectIds?: string[] | null;
    };
    const initialRenderIds = placeablesPropsBeforeSelect.renderObjectIds ?? [];

    fireEvent.click(screen.getByRole("button", { name: /plc_table_02/i }));

    await waitFor(() => {
      const selectedLastCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const placeablesPropsAfterSelect = selectedLastCall?.[0] as {
        renderObjectIds?: string[] | null;
        externalSceneSeed?: { sceneId?: string; tiles?: unknown[]; objects?: Array<{ id: string }> } | null;
      };
      const selectedRenderIds = placeablesPropsAfterSelect.renderObjectIds ?? [];
      expect(selectedRenderIds).toHaveLength(1);
      expect(selectedRenderIds[0]).toMatch(/^preview:/i);
      expect(selectedRenderIds[0]).not.toBe(initialRenderIds[0]);
      expect(placeablesPropsAfterSelect.externalSceneSeed?.sceneId).toBe("preview:plc_table_02");
      expect(placeablesPropsAfterSelect.externalSceneSeed?.tiles ?? []).toHaveLength(0);
      expect(placeablesPropsAfterSelect.externalSceneSeed?.objects?.[0]?.id).toBe(
        selectedRenderIds[0]
      );
    });

    const placeablesList = screen.getByRole("list", { name: /placeables mode list/i });
    expect(within(placeablesList).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: /plc_barrel_01/i })).toBeInTheDocument();
  });

  it("requests process + asset contracts after placeable selection and forwards render payload state", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceable = vi.fn(async (
      _accessToken: string,
      payload: { templateId?: string; resref?: string }
    ) => {
      const templateId = payload.templateId ?? "plc_unknown";
      return {
        cacheKey: `cache_key_${templateId}`,
        cacheHit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0,
        placeable: {
          templateId,
          resref: `resref_${templateId}`,
          name: templateId.toUpperCase(),
          category: "placeables",
          placeableSubtype: "generic" as const,
          render: {
            backendType: "generic" as const,
            frontendType: "placeable" as const,
            rendererPreset: "default",
            isDoor: false,
            isVfx: false
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-01-01T00:00:00.000Z",
            assetCount: 2,
            candidatesScanned: 2,
            assets: [
              {
                assetId: `asset_model_${templateId}`,
                role: "model" as const,
                fileName: `${templateId}.mdl`,
                objectKey: `objects/${templateId}.mdl`,
                extension: "mdl",
                sizeBytes: 1234,
                contentType: "application/octet-stream"
              },
              {
                assetId: `asset_texture_${templateId}`,
                role: "texture" as const,
                fileName: `${templateId}.tga`,
                objectKey: `objects/${templateId}.tga`,
                extension: "tga",
                sizeBytes: 4321,
                contentType: "image/x-tga"
              }
            ]
          }
        }
      };
    });
    const getPlaceableAssetContracts = vi.fn(
      async (_accessToken: string, cacheKey: string, assetIds?: string[]) => ({
        cacheKey,
        assets: (assetIds ?? []).map((assetId) => ({
          assetId,
          objectKey: `objects/${assetId}`,
          contentType: assetId.includes("texture") ? "image/x-tga" : "application/octet-stream",
          sizeBytes: 512,
          deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`,
          deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`
        }))
      })
    );
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceable,
      getPlaceableAssetContracts
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    await screen.findByRole("button", { name: /plc_table_02/i });

    const processCallsBeforeSelect = processPlaceable.mock.calls.length;
    const contractsCallsBeforeSelect = getPlaceableAssetContracts.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /plc_table_02/i }));

    expect(processPlaceable.mock.calls.length).toBeGreaterThan(processCallsBeforeSelect);

    await waitFor(() => {
      expect(processPlaceable.mock.calls.length).toBeGreaterThan(processCallsBeforeSelect);
      expect(getPlaceableAssetContracts.mock.calls.length).toBeGreaterThan(contractsCallsBeforeSelect);
    });

    const processTriggeredForSelected = processPlaceable.mock.calls.some(([token, payload]) => {
      const normalizedPayload = payload as { templateId?: string; resref?: string };
      return (
        token === "token" &&
        normalizedPayload.templateId === "plc_table_02" &&
        normalizedPayload.resref === "plc_a02"
      );
    });
    expect(processTriggeredForSelected).toBe(true);

    const contractsTriggeredForSelected = getPlaceableAssetContracts.mock.calls.some(
      ([token, cacheKey, assetIds]) => {
        const normalizedAssetIds = Array.isArray(assetIds) ? assetIds : [];
        return (
          token === "token" &&
          cacheKey === "cache_key_plc_table_02" &&
          normalizedAssetIds.includes("asset_model_plc_table_02") &&
          normalizedAssetIds.includes("asset_texture_plc_table_02")
        );
      }
    );
    expect(contractsTriggeredForSelected).toBe(true);

    const lastViewportCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const lastViewportProps = (lastViewportCall?.[0] ?? {}) as Record<string, unknown>;
    const serializedViewportProps = JSON.stringify(lastViewportProps);
    expect(serializedViewportProps).toContain("cache_key_plc_table_02");
    expect(serializedViewportProps).toContain("asset_model_plc_table_02");
    expect(serializedViewportProps).toContain("asset_texture_plc_table_02");
  });

  it("restores persisted VFX filter and labels ready derived GLB assets as preview-only", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    window.localStorage.setItem(
      PLACEABLES_MODE_STATE_STORAGE_KEY,
      JSON.stringify({
        activeObjectId: "plc_cot_fx01",
        searchQuery: "vfx"
      })
    );
    const vfxPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_cot_fx01",
            resref: "cot_fx01",
            name: "VFX: Smoke, Red*",
            category: "effects",
            placeableSubtype: "vfx" as const,
            tags: ["vfx"],
            previewImageUrl: "/preview/plc_cot_fx01.png"
          }
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getPlaceablePreview: vi.fn(async (accessToken, templateId) => ({
        templateId,
        resref: "cot_fx01",
        name: "VFX: Smoke, Red*",
        category: "effects",
        placeableSubtype: "vfx" as const,
        previewImageUrl: `/preview/${templateId}.png`,
        metadata: {
          frontendType: "vfx",
          rendererPreset: "vfx-emitter"
        }
      })),
      processPlaceable: vi.fn(async () => ({
        cacheKey: "cache_key_vfx",
        cacheHit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0,
        placeable: {
          templateId: "plc_cot_fx01",
          resref: "cot_fx01",
          name: "VFX: Smoke, Red*",
          category: "effects",
          placeableSubtype: "vfx" as const,
          render: {
            backendType: "vfx" as const,
            frontendType: "vfx" as const,
            rendererPreset: "vfx-emitter",
            isDoor: false,
            isVfx: true
          },
          renderPackage: {
            status: "ready" as const,
            diagnostics: [],
            assetRefs: {
              derivedModelAssetIds: ["derived_model_plc_cot_fx01"],
              textureAssetIds: ["texture_plc_cot_fx01"]
            },
            glbUrl: "/assets/plc_cot_fx01.glb",
            textureUrls: ["/assets/fx_smoke_red.dds"]
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-01-01T00:00:00.000Z",
            assetCount: 2,
            candidatesScanned: 2,
            assets: [
              {
                assetId: "derived_model_plc_cot_fx01",
                role: "model" as const,
                fileName: "plc_cot_fx01.glb",
                objectKey: "objects/plc_cot_fx01.glb",
                extension: "glb",
                sizeBytes: 1234,
                contentType: "model/gltf-binary"
              },
              {
                assetId: "texture_plc_cot_fx01",
                role: "texture" as const,
                fileName: "fx_smoke_red.dds",
                objectKey: "objects/fx_smoke_red.dds",
                extension: "dds",
                sizeBytes: 4321,
                contentType: "image/vnd-ms.dds"
              }
            ]
          }
        }
      })),
      getPlaceableAssetContracts: vi.fn(async (_accessToken, cacheKey, assetIds) => ({
        cacheKey,
        assets: (assetIds ?? []).map((assetId) => ({
          assetId,
          objectKey: `objects/${assetId}`,
          contentType: assetId.includes("texture") ? "image/vnd-ms.dds" : "model/gltf-binary",
          sizeBytes: 512,
          deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`,
          deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`
        }))
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={vfxPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    expect(screen.getByRole("searchbox", { name: /filter placeables/i })).toHaveValue("vfx");
    await waitFor(() => {
      expect(vfxPort.listPlaceables).toHaveBeenCalledWith("token", {
        limit: 1000,
        offset: 0,
        query: "vfx"
      });
    });
    await within(inspector).findByText(
      "preview_only / retail blocked (asset ready)"
    );
    expect(within(inspector).getByText("not rendered for VFX")).toBeInTheDocument();
    expect(within(inspector).getByText("static_model_preview")).toBeInTheDocument();
    expect(
      within(inspector).getByText(/VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT/)
    ).toBeInTheDocument();
    expect(
      within(inspector).getByText(/VFX_STATIC_MODEL_PREVIEW_NON_CANONICAL/)
    ).toBeInTheDocument();
    expect(vfxPort.getPlaceableAssetContracts).not.toHaveBeenCalled();
    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const lastViewportProps = (lastViewportCall?.[0] ?? {}) as {
        externalSceneSeed?: { objects?: Array<{ id: string }> } | null;
        placeableRenderPayloadByObjectId?: Record<string, { cacheKey: string; templateId: string }> | null;
      };
      const previewObjectId = lastViewportProps.externalSceneSeed?.objects?.[0]?.id;
      expect(previewObjectId).toBe("preview:plc_cot_fx01");
      expect(lastViewportProps.placeableRenderPayloadByObjectId).toEqual(
        expect.objectContaining({
          ["preview:plc_cot_fx01"]: expect.objectContaining({
            cacheKey: "cache_key_vfx",
            templateId: "plc_cot_fx01"
          })
        })
      );
    });
  });

  it("marks VFX source MDL light-node payloads as visible preview in placeables inspector", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    window.localStorage.setItem(
      PLACEABLES_MODE_STATE_STORAGE_KEY,
      JSON.stringify({
        activeObjectId: "plc_dlp_light_08",
        searchQuery: "pulse"
      })
    );
    const vfxPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_dlp_light_08",
            resref: "dlp_light_08",
            name: "VFX: Pulse Light, Green*",
            category: "effects",
            placeableSubtype: "vfx" as const,
            tags: ["vfx", "light"],
            previewImageUrl: "/preview/plc_dlp_light_08.png"
          }
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getPlaceablePreview: vi.fn(async (accessToken, templateId) => ({
        templateId,
        resref: "dlp_light_08",
        name: "VFX: Pulse Light, Green*",
        category: "effects",
        placeableSubtype: "vfx" as const,
        previewImageUrl: `/preview/${templateId}.png`,
        metadata: {
          frontendType: "vfx",
          rendererPreset: "vfx-emitter"
        }
      })),
      processPlaceable: vi.fn(async () => ({
        cacheKey: "cache_key_vfx_light",
        cacheHit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0,
        placeable: {
          templateId: "plc_dlp_light_08",
          resref: "dlp_light_08",
          name: "VFX: Pulse Light, Green*",
          category: "effects",
          placeableSubtype: "vfx" as const,
          render: {
            backendType: "vfx" as const,
            frontendType: "vfx" as const,
            rendererPreset: "vfx-emitter",
            isDoor: false,
            isVfx: true
          },
          renderPackage: {
            status: "ready" as const,
            diagnostics: [
              {
                code: "VFX_AURORA_MDL_LIGHT_PAYLOAD_READY",
                severity: "info" as const,
                message: "Parsed source MDL light node payload."
              }
            ],
            assetRefs: {},
            textureUrls: [],
            auroraLight: {
              source: "source-mdl" as const,
              diagnostics: [],
              lights: [
                {
                  source: "aurora-mdl-ascii" as const,
                  sourceModelAssetId: "source-model-light",
                  sourceModelFileName: "dlp_light_08.mdl",
                  sourceModelObjectKey: "modules/current/models/dlp_light_08.mdl",
                  nodeName: "pulsing_light03",
                  parentNodeName: "dlp_light_08",
                  transform: {
                    position: [0, 0, 2.5]
                  },
                  radius: 3,
                  multiplier: 3,
                  color: [0, 0.592157, 0.141176],
                  ambientOnly: false,
                  dynamicType: 1,
                  affectDynamic: true,
                  shadow: true,
                  lightPriority: 2
                }
              ]
            }
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-01-01T00:00:00.000Z",
            assetCount: 0,
            candidatesScanned: 1,
            assets: []
          }
        }
      })),
      getPlaceableAssetContracts: vi.fn(async () => ({
        cacheKey: "cache_key_vfx_light",
        assets: []
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={vfxPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    await within(inspector).findByText(
      "preview_only / retail blocked (asset ready)"
    );
    expect(within(inspector).getByText("aurora_light_node_preview")).toBeInTheDocument();
    expect(within(inspector).queryByText(/none \(source only\)/i)).not.toBeInTheDocument();
    expect(
      within(inspector).getByText(/VFX_AURORA_MDL_LIGHT_PAYLOAD_READY/)
    ).toHaveAttribute(
      "title",
      expect.stringContaining("VFX_AURORA_LIGHT_NODE_PREVIEW_NON_CANONICAL")
    );
    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const lastViewportProps = (lastViewportCall?.[0] ?? {}) as {
        placeableRenderPayloadByObjectId?: Record<
          string,
          { renderPackage?: { auroraLight?: { lights?: unknown[] } } }
        > | null;
      };
      expect(
        lastViewportProps.placeableRenderPayloadByObjectId?.["preview:plc_dlp_light_08"]
          ?.renderPackage?.auroraLight?.lights
      ).toHaveLength(1);
    });
  });

  it("marks catalog VFX preview objects before render payload loading completes", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceable = vi.fn(
      () => new Promise<Awaited<ReturnType<PlaceableApiPort["processPlaceable"]>>>(() => undefined)
    );
    const vfxPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_phod_fx_pntgrm2",
            resref: "phod_fx_pntgrm2",
            name: "VFX: Pentagram Small*",
            category: "effects",
            placeableSubtype: "vfx" as const,
            tags: ["vfx"],
            previewImageUrl: "/preview/plc_phod_fx_pntgrm2.png"
          }
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getPlaceablePreview: vi.fn(
        () => new Promise<Awaited<ReturnType<PlaceableApiPort["getPlaceablePreview"]>>>(() => undefined)
      ),
      processPlaceable,
      getPlaceableAssetContracts: vi.fn(async () => ({
        cacheKey: "cache_key_vfx",
        assets: []
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={vfxPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /phod_fx_pntgrm2/i });
    await waitFor(() => expect(processPlaceable).toHaveBeenCalled());
    expect(vfxPort.getPlaceablePreview).not.toHaveBeenCalled();
    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    await within(inspector).findByText("preview_only / retail blocked (asset loading)");
    expect(within(inspector).getByText("not rendered for VFX")).toBeInTheDocument();
    expect(within(inspector).getByText("loading")).toBeInTheDocument();
    expect(within(inspector).getByText("sprite_scaffold")).toBeInTheDocument();
    expect(
      within(inspector).getByText(/VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT/)
    ).toBeInTheDocument();
    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const props = (lastViewportCall?.[0] ?? {}) as {
        externalSceneSeed?: {
          objects?: Array<{
            id: string;
            vfxPayload?: {
              canonicalStatus?: string;
              flags?: Record<string, boolean>;
              sourceResRef?: string;
            };
          }>;
        } | null;
      };
      const previewObject = props.externalSceneSeed?.objects?.[0];
      expect(previewObject?.id).toBe("preview:plc_phod_fx_pntgrm2");
      expect(previewObject?.vfxPayload?.canonicalStatus).toBe("preview_only");
      expect(previewObject?.vfxPayload?.flags?.isPlaceableVfx).toBe(true);
      expect(previewObject?.vfxPayload?.sourceResRef).toBe("phod_fx_pntgrm2");
    });
  });

  it("clears the stale active VFX payload while a new placeables filter is loading", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const pendingCatalog = new Promise<
      Awaited<ReturnType<PlaceableApiPort["listPlaceables"]>>
    >(() => undefined);
    const vfxPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async (_accessToken, query) => {
        if (query?.query === "fresh") {
          return pendingCatalog;
        }
        return {
          items: [
            {
              templateId: "plc_phod_fx_pntgrm2",
              resref: "phod_fx_pntgrm2",
              name: "VFX: Pentagram Small*",
              category: "effects",
              placeableSubtype: "vfx" as const,
              tags: ["vfx"],
              previewImageUrl: "/preview/plc_phod_fx_pntgrm2.png"
            }
          ],
          total: 1,
          limit: 1000,
          offset: 0
        };
      }),
      getPlaceablePreview: vi.fn(
        () => new Promise<Awaited<ReturnType<PlaceableApiPort["getPlaceablePreview"]>>>(() => undefined)
      ),
      processPlaceable: vi.fn(async () => ({
        cacheKey: "cache_key_pntgrm2",
        cacheHit: true,
        storedAt: "2026-06-06T00:00:00.000Z",
        hits: 1,
        placeable: {
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          name: "VFX: Pentagram Small*",
          category: "effects",
          placeableSubtype: "vfx" as const,
          render: {
            backendType: "vfx" as const,
            frontendType: "vfx" as const,
            rendererPreset: "vfx-emitter",
            isDoor: false,
            isVfx: true
          },
          renderPackage: {
            status: "ready" as const,
            diagnostics: [],
            assetRefs: {
              textureAssetIds: ["tex_pntgrm"]
            },
            textureUrls: ["/cache/phod_fx_pntgrm.tga"]
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-06-06T00:00:00.000Z",
            assetCount: 1,
            candidatesScanned: 1,
            assets: [
              {
                assetId: "tex_pntgrm",
                role: "texture" as const,
                fileName: "phod_fx_pntgrm.tga",
                objectKey: "modules/current/phod_fx_pntgrm.tga",
                extension: "tga",
                sizeBytes: 512,
                contentType: "image/x-tga"
              }
            ]
          }
        }
      })),
      getPlaceableAssetContracts: vi.fn(async () => ({
        cacheKey: "cache_key_pntgrm2",
        assets: []
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={vfxPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /phod_fx_pntgrm2/i });
    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    await within(inspector).findByText(
      "preview_only / retail blocked (asset ready)"
    );

    fireEvent.change(screen.getByRole("searchbox", { name: /filter placeables/i }), {
      target: { value: "fresh" }
    });

    expect(screen.getByRole("searchbox", { name: /filter placeables/i })).toHaveValue("fresh");
    await waitFor(() => {
      expect(vfxPort.listPlaceables).toHaveBeenCalledWith("token", {
        limit: 1000,
        offset: 0,
        query: "fresh"
      });
    });
    await waitFor(() => {
      const updatedInspector = screen.getByRole("article", {
        name: /placeables mode inspector/i
      });
      expect(
        within(updatedInspector).queryByText(
          "preview_only / retail blocked (asset ready)"
        )
      ).not.toBeInTheDocument();
      expect(within(updatedInspector).getByText(/loading render payload/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toHaveTextContent(/loading placeables from backend/i);
  });

  it("forwards VFX renderPackage as soon as processPlaceable resolves while asset contracts keep loading", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    window.localStorage.setItem(
      PLACEABLES_MODE_STATE_STORAGE_KEY,
      JSON.stringify({
        activeObjectId: "plc_phod_fx_chunked",
        searchQuery: "chunked"
      })
    );
    const getPlaceableAssetContracts = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<PlaceableApiPort["getPlaceableAssetContracts"]>>>(
          () => undefined
        )
    );
    const vfxPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_phod_fx_chunked",
            resref: "phod_fx_chunked",
            name: "VFX: Chunked Test",
            category: "effects",
            placeableSubtype: "vfx" as const,
            tags: ["vfx"],
            previewImageUrl: "/preview/plc_phod_fx_chunked.png"
          }
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getPlaceablePreview: vi.fn(
        () => new Promise<Awaited<ReturnType<PlaceableApiPort["getPlaceablePreview"]>>>(() => undefined)
      ),
      processPlaceable: vi.fn(async () => ({
        cacheKey: "cache_key_vfx_chunked",
        cacheHit: true,
        storedAt: "2026-06-06T00:00:00.000Z",
        hits: 1,
        placeable: {
          templateId: "plc_phod_fx_chunked",
          resref: "phod_fx_chunked",
          name: "VFX: Chunked Test",
          category: "effects",
          placeableSubtype: "vfx" as const,
          render: {
            backendType: "vfx" as const,
            frontendType: "vfx" as const,
            rendererPreset: "vfx-emitter",
            isDoor: false,
            isVfx: true
          },
          renderPackage: {
            status: "ready" as const,
            diagnostics: [],
            assetRefs: {
              chunkModelAssetIds: ["mdl_chunk"],
              textureAssetIds: ["tex_vfx"]
            },
            textureUrls: [
              "/api/v1/catalog/placeables/cache/cache_key_vfx_chunked/assets/tex_vfx.tga"
            ],
            auroraEmitter: {
              source: "source-mdl" as const,
              diagnostics: [],
              emitters: [
                {
                  source: "aurora-mdl-binary" as const,
                  sourceModelAssetId: "mdl_source",
                  sourceModelFileName: "phod_fx_chunked.mdl",
                  sourceModelObjectKey: "modules/current/phod_fx_chunked.mdl",
                  nodeName: "chunked_test_emitter",
                  texture: "tex_vfx",
                  emitterType: "Fountain",
                  renderMode: "Billboard_to_World_Z",
                  blendMode: "Lighten",
                  simulation: {
                    birthrate: 1,
                    lifeExp: 1,
                    sizeStart: 1,
                    sizeEnd: 1,
                    alphaStart: 1,
                    alphaEnd: 1
                  }
                }
              ]
            }
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-06-06T00:00:00.000Z",
            assetCount: 2,
            candidatesScanned: 2,
            assets: [
              {
                assetId: "mdl_chunk",
                role: "model" as const,
                fileName: "chunked_piece.glb",
                objectKey: "modules/current/chunked_piece.glb",
                extension: "glb",
                sizeBytes: 2048,
                contentType: "model/gltf-binary"
              },
              {
                assetId: "tex_vfx",
                role: "texture" as const,
                fileName: "tex_vfx.tga",
                objectKey: "modules/current/tex_vfx.tga",
                extension: "tga",
                sizeBytes: 512,
                contentType: "image/x-tga"
              }
            ]
          }
        }
      })),
      getPlaceableAssetContracts
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={vfxPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    await within(inspector).findByText(
      "preview_only / retail blocked (asset ready)"
    );
    expect(within(inspector).getByText("aurora_emitter_particle_preview")).toBeInTheDocument();
    expect(vfxPort.getPlaceablePreview).not.toHaveBeenCalled();
    expect(getPlaceableAssetContracts).toHaveBeenCalledWith(
      "token",
      "cache_key_vfx_chunked",
      ["mdl_chunk", "tex_vfx"],
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const lastViewportProps = (lastViewportCall?.[0] ?? {}) as {
        externalSceneSeed?: {
          objects?: Array<{
            id: string;
            vfxPayload?: {
              flags?: Record<string, boolean>;
              previewMode?: string;
              sourceResRef?: string;
            };
          }>;
        } | null;
        placeableRenderPayloadByObjectId?: Record<
          string,
          {
            assetContracts?: { assets?: unknown[] };
            renderPackage?: { auroraEmitter?: { emitters?: Array<{ nodeName?: string }> } };
          }
        > | null;
      };
      const previewObject = lastViewportProps.externalSceneSeed?.objects?.[0];
      expect(previewObject?.id).toBe("preview:plc_phod_fx_chunked");
      expect(previewObject?.vfxPayload?.flags?.isPlaceableVfx).toBe(true);
      expect(previewObject?.vfxPayload?.previewMode).toBe("aurora_emitter_particle_preview");
      expect(previewObject?.vfxPayload?.sourceResRef).toBe("phod_fx_chunked");
      expect(lastViewportProps.placeableRenderPayloadByObjectId).toEqual(
        expect.objectContaining({
          ["preview:plc_phod_fx_chunked"]: expect.objectContaining({
            assetContracts: expect.objectContaining({
              assets: []
            }),
            renderPackage: expect.objectContaining({
              auroraEmitter: expect.objectContaining({
                emitters: [expect.objectContaining({ nodeName: "chunked_test_emitter" })]
              })
            })
          })
        })
      );
    });
  });

  it("shows canonical Aurora VFX payload diagnostic groups without enabling a renderer", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceable = vi.fn(async () => ({
      cacheKey: "cache_key_vfx_canonical",
      cacheHit: false,
      storedAt: "2026-01-01T00:00:00.000Z",
      hits: 0,
      placeable: {
        templateId: "plc_vfx_canonical",
        resref: "vfx_impact",
        name: "VFX: Canonical Bridge",
        category: "placeables",
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-emitter",
          isDoor: false,
          isVfx: true
        },
        renderPackage: {
          status: "ready",
          diagnostics: [],
          assetRefs: {},
          auroraVfxPayload: canonicalAuroraVfxPayload()
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-01-01T00:00:00.000Z",
          assetCount: 0,
          candidatesScanned: 0,
          assets: []
        },
        metadata: {
          rendererPreset: "vfx-emitter"
        }
      }
    }));
    const vfxPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_vfx_canonical",
            resref: "vfx_impact",
            name: "VFX: Canonical Bridge",
            category: "placeables",
            placeableSubtype: "vfx",
            tags: ["vfx"],
            previewImageUrl: ""
          }
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      processPlaceable,
      getPlaceableAssetContracts: vi.fn(async () => ({
        cacheKey: "cache_key_vfx_canonical",
        assets: []
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={vfxPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /canonical bridge/i });
    await waitFor(() => expect(processPlaceable).toHaveBeenCalled());
    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    await within(inspector).findByText("source_backed / retail unproven (asset ready)");
    expect(within(inspector).getByText("none")).toBeInTheDocument();
    expect(
      within(inspector).getByText("source 1, effect 1, schedule 1, dependency 1, runtime 1, render 1")
    ).toBeInTheDocument();
    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const props = (lastViewportCall?.[0] ?? {}) as {
        externalSceneSeed?: {
          objects?: Array<{
            vfxPayload?: {
              canonicalStatus?: string;
              auroraPayload?: { backendCanonical?: boolean };
            };
          }>;
        } | null;
      };
      const previewObject = props.externalSceneSeed?.objects?.[0];
      expect(previewObject?.vfxPayload?.canonicalStatus).toBe("canonical");
      expect(previewObject?.vfxPayload?.auroraPayload?.backendCanonical).toBe(true);
    });
  });

  it("resolves the pentagram VFX render payload and forwards it to the preview object", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    window.localStorage.setItem(
      PLACEABLES_MODE_STATE_STORAGE_KEY,
      JSON.stringify({
        activeObjectId: "plc_phod_fx_pntgrm2",
        searchQuery: "pntgrm"
      })
    );
    const getPlaceableAssetContracts = vi.fn(
      async (_accessToken: string, cacheKey: string, assetIds?: string[]) => ({
        cacheKey,
        assets: (assetIds ?? []).map((assetId) => ({
          assetId,
          objectKey: `modules/current/textures/${assetId}.tga`,
          contentType: "image/x-tga",
          sizeBytes: 196626,
          deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}.tga`,
          deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}.tga`
        }))
      })
    );
    const pentagramPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_phod_fx_pntgrm2",
            resref: "phod_fx_pntgrm2",
            name: "VFX: Pentagram Small* (PLUSH HYENA of DOOM)",
            category: "effects",
            placeableSubtype: "vfx" as const,
            tags: ["vfx"],
            previewImageUrl: "/preview/plc_phod_fx_pntgrm2.png"
          }
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getPlaceablePreview: vi.fn(async () => ({
        templateId: "plc_phod_fx_pntgrm2",
        resref: "phod_fx_pntgrm2",
        name: "VFX: Pentagram Small* (PLUSH HYENA of DOOM)",
        category: "effects",
        placeableSubtype: "vfx" as const,
        previewImageUrl: "/preview/plc_phod_fx_pntgrm2.png"
      })),
      processPlaceable: vi.fn(async () => ({
        cacheKey: "bc720ee737101aec2be3d1f3ab1f65bc57b93517c12ca02e378001e511988b01",
        cacheHit: true,
        storedAt: "2026-06-06T00:00:00.000Z",
        hits: 1,
        placeable: {
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          name: "VFX: Pentagram Small* (PLUSH HYENA of DOOM)",
          category: "effects",
          placeableSubtype: "vfx" as const,
          render: {
            backendType: "vfx" as const,
            frontendType: "vfx" as const,
            rendererPreset: "vfx-emitter",
            isDoor: false,
            isVfx: true
          },
          renderPackage: {
            status: "ready" as const,
            diagnostics: [
              {
                code: "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY",
                severity: "warn" as const,
                message: "Aurora MDL emitter payload is available."
              }
            ],
            assetRefs: {
              modelAssetIds: ["989235c33f204afd065b97c4"],
              textureAssetIds: ["5a3ffcf1c7b1828e9f11b0e7"]
            },
            textureUrls: [
              "/api/v1/catalog/placeables/cache/bc720ee737101aec2be3d1f3ab1f65bc57b93517c12ca02e378001e511988b01/assets/5a3ffcf1c7b1828e9f11b0e7.tga"
            ],
            auroraEmitter: {
              source: "source-mdl" as const,
              diagnostics: [],
              emitters: [
                {
                  source: "aurora-mdl-binary" as const,
                  sourceModelAssetId: "989235c33f204afd065b97c4",
                  sourceModelFileName: "phod_fx_pntgrm2.mdl",
                  sourceModelObjectKey:
                    "modules/current/__aurora/sources/hak/cep3_core2/phod_fx_pntgrm2.mdl",
                  nodeName: "lightshaft_purple08",
                  texture: "phod_fx_pntgrm",
                  emitterType: "Fountain",
                  renderMode: "Aligned_to_World_Z",
                  blendMode: "Lighten",
                  simulation: {
                    birthrate: 3,
                    lifeExp: 4,
                    sizeStart: 3,
                    sizeEnd: 3,
                    alphaStart: 0.2,
                    alphaEnd: 0.1,
                    colorStart: [1, 0.4, 0] as [number, number, number],
                    colorEnd: [1, 0.4, 0] as [number, number, number]
                  }
                },
                {
                  source: "aurora-mdl-binary" as const,
                  sourceModelAssetId: "989235c33f204afd065b97c4",
                  sourceModelFileName: "phod_fx_pntgrm2.mdl",
                  sourceModelObjectKey:
                    "modules/current/__aurora/sources/hak/cep3_core2/phod_fx_pntgrm2.mdl",
                  nodeName: "lightBase_purple23",
                  texture: "phod_fx_pntgrm",
                  emitterType: "Fountain",
                  renderMode: "Billboard_to_World_Z",
                  blendMode: "Lighten",
                  simulation: {
                    birthrate: 3,
                    lifeExp: 4,
                    sizeStart: 1,
                    sizeEnd: 1,
                    alphaStart: 0.2,
                    alphaEnd: 0.1,
                    colorStart: [1, 0.4, 0] as [number, number, number],
                    colorEnd: [1, 0.4, 0] as [number, number, number]
                  }
                }
              ]
            }
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-06-06T00:00:00.000Z",
            assetCount: 2,
            candidatesScanned: 2,
            assets: [
              {
                assetId: "989235c33f204afd065b97c4",
                role: "model" as const,
                fileName: "phod_fx_pntgrm2.mdl",
                objectKey:
                  "modules/current/__aurora/sources/hak/cep3_core2/phod_fx_pntgrm2.mdl",
                extension: "mdl",
                sizeBytes: 14932,
                contentType: "application/octet-stream"
              },
              {
                assetId: "5a3ffcf1c7b1828e9f11b0e7",
                role: "texture" as const,
                fileName: "phod_fx_pntgrm.tga",
                objectKey:
                  "modules/current/__aurora/sources/hak/cep3_core2/phod_fx_pntgrm.tga",
                extension: "tga",
                sizeBytes: 196626,
                contentType: "image/x-tga"
              }
            ]
          }
        }
      })),
      getPlaceableAssetContracts
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={pentagramPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    expect(screen.getByRole("searchbox", { name: /filter placeables/i })).toHaveValue("pntgrm");
    await within(inspector).findByText(
      "preview_only / retail blocked (asset ready)"
    );
    expect(within(inspector).getByText("aurora_emitter_particle_preview")).toBeInTheDocument();
    expect(pentagramPort.getPlaceablePreview).not.toHaveBeenCalled();
    expect(getPlaceableAssetContracts).toHaveBeenCalledWith(
      "token",
      "bc720ee737101aec2be3d1f3ab1f65bc57b93517c12ca02e378001e511988b01",
      ["5a3ffcf1c7b1828e9f11b0e7"],
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const lastViewportProps = (lastViewportCall?.[0] ?? {}) as {
        externalSceneSeed?: {
          objects?: Array<{
            id: string;
            vfxPayload?: {
              flags?: Record<string, boolean>;
              previewMode?: string;
              sourceResRef?: string;
            };
          }>;
        } | null;
        placeableRenderPayloadByObjectId?: Record<
          string,
          {
            cacheKey: string;
            assetContracts?: { assets?: Array<{ assetId: string; deliveryUrl: string }> };
            renderPackage?: { auroraEmitter?: { emitters?: unknown[] } };
          }
        > | null;
      };
      const previewObject = lastViewportProps.externalSceneSeed?.objects?.[0];
      expect(previewObject?.id).toBe("preview:plc_phod_fx_pntgrm2");
      expect(previewObject?.vfxPayload?.flags?.isPlaceableVfx).toBe(true);
      expect(previewObject?.vfxPayload?.previewMode).toBe("aurora_emitter_particle_preview");
      expect(previewObject?.vfxPayload?.sourceResRef).toBe("phod_fx_pntgrm2");
      expect(lastViewportProps.placeableRenderPayloadByObjectId).toEqual(
        expect.objectContaining({
          ["preview:plc_phod_fx_pntgrm2"]: expect.objectContaining({
            cacheKey: "bc720ee737101aec2be3d1f3ab1f65bc57b93517c12ca02e378001e511988b01",
            assetContracts: expect.objectContaining({
              assets: expect.arrayContaining([
                expect.objectContaining({
                  assetId: "5a3ffcf1c7b1828e9f11b0e7",
                  deliveryUrl:
                    "/api/v1/catalog/placeables/cache/bc720ee737101aec2be3d1f3ab1f65bc57b93517c12ca02e378001e511988b01/assets/5a3ffcf1c7b1828e9f11b0e7.tga"
                })
              ])
            }),
            renderPackage: expect.objectContaining({
              auroraEmitter: expect.objectContaining({
                emitters: expect.arrayContaining([
                  expect.objectContaining({ nodeName: "lightshaft_purple08" }),
                  expect.objectContaining({ nodeName: "lightBase_purple23" })
                ])
              })
            })
          })
        })
      );
    });
  });

  it("keeps catalog VFX identity without requesting generic backend preview", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceable = vi.fn(
      () => new Promise<Awaited<ReturnType<PlaceableApiPort["processPlaceable"]>>>(() => undefined)
    );
    const vfxPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_phod_fx_pntgrm2",
            resref: "phod_fx_pntgrm2",
            name: "VFX: Pentagram Small*",
            category: "effects",
            placeableSubtype: "vfx" as const,
            tags: ["vfx"],
            previewImageUrl: "/preview/plc_phod_fx_pntgrm2.png"
          }
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getPlaceablePreview: vi.fn(async () => ({
        templateId: "",
        resref: "",
        name: "",
        category: "placeables",
        placeableSubtype: "generic" as const,
        previewImageUrl: "/preview/generic.png",
        metadata: {}
      })),
      processPlaceable,
      getPlaceableAssetContracts: vi.fn(async () => ({
        cacheKey: "cache_key_vfx",
        assets: []
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={vfxPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        activeBuilderModeId="placeables_mode"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await screen.findByRole("button", { name: /phod_fx_pntgrm2/i });
    await waitFor(() => expect(processPlaceable).toHaveBeenCalled());
    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    await within(inspector).findByText("preview_only / retail blocked (asset loading)");
    expect(within(inspector).getByText("sprite_scaffold")).toBeInTheDocument();
    expect(vfxPort.getPlaceablePreview).not.toHaveBeenCalled();
    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const props = (lastViewportCall?.[0] ?? {}) as {
        externalSceneSeed?: {
          objects?: Array<{
            id: string;
            vfxPayload?: {
              canonicalStatus?: string;
              flags?: Record<string, boolean>;
              sourceResRef?: string;
            };
          }>;
        } | null;
      };
      const previewObject = props.externalSceneSeed?.objects?.[0];
      expect(previewObject?.id).toBe("preview:plc_phod_fx_pntgrm2");
      expect(previewObject?.vfxPayload?.canonicalStatus).toBe("preview_only");
      expect(previewObject?.vfxPayload?.flags?.isPlaceableVfx).toBe(true);
      expect(previewObject?.vfxPayload?.sourceResRef).toBe("phod_fx_pntgrm2");
    });
  });

  it("preserves backend area composition and per-kind objects in the opened workspace scene seed", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaPortWithFullComposition: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_count_fidelity",
            name: "Area Count Fidelity",
            biome: "urban",
            width: 4,
            height: 3,
            objectCounts: {
              placeables: 1,
              doors: 1,
              creatures: 1,
              items: 1,
              sounds: 1,
              total: 5
            },
            updatedAt: "2026-06-16T20:00:00.000Z"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_count_fidelity",
        name: "Area Count Fidelity",
        biome: "urban",
        width: 4,
        height: 3,
        tags: ["count-fidelity"],
        previewImageUrl: "/preview/area_count_fidelity.webp",
        textureAtlas: {
          atlasId: "atlas_area_count_fidelity",
          cacheKey: "atlas_area_count_fidelity:4x3",
          strategy: "blob-cache",
          objectKey: "modules/current/areas/atlases/atlas_area_count_fidelity.webp",
          contentType: "image/webp",
          sizeBytes: 8192
        },
        composition: {
          placeables: 1,
          doors: 1,
          creatures: 1,
          items: 1,
          sounds: 1,
          total: 5
        },
        updatedAt: "2026-06-16T20:00:00.000Z",
        objects: [
          {
            objectId: "plc_01",
            kind: "placeable",
            templateId: "plc_market_stall_001",
            x: 1,
            y: 1,
            z: 0,
            bearing: 0
          },
          {
            objectId: "door_01",
            kind: "door",
            templateId: "nw_door_ttr_11",
            x: 2,
            y: 1,
            z: 0,
            bearing: 90
          },
          {
            objectId: "creature_01",
            kind: "creature",
            templateId: "nw_hguard",
            x: 1,
            y: 2,
            z: 0,
            bearing: 180
          },
          {
            objectId: "item_01",
            kind: "item",
            templateId: "nw_it_mpotion001",
            x: 2,
            y: 2,
            z: 0,
            bearing: 270
          },
          {
            objectId: "sound_01",
            kind: "sound",
            templateId: "amb_city_market_day",
            x: 3,
            y: 2,
            z: 0,
            bearing: 0,
            soundPositioning: {
              mode: "specific",
              elevation: 0,
              maxVolumeDistance: 2,
              cutoffDistance: 12,
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
                intervalMs: 0,
                intervalVariationMs: 0,
                volume: 0.7,
                volumeVariation: 0,
                pitchVariation: 0,
                priority: 1,
                flags: {
                  active: true,
                  looping: true,
                  random: false,
                  positional: true,
                  randomPosition: false
                },
                extra: {
                  backendSoundId: "sound_ambient_city_market_001",
                  soundTemplateSource: "area-payload"
                }
              }
            }
          }
        ]
      }))
    };
    attachProcessAreaFromDetail(areaPortWithFullComposition);

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithFullComposition}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(await screen.findByText("urban | 4x3 | 5 objects")).toBeInTheDocument();
    expect(
      screen.getByText("1 placeable, 1 door, 1 creature, 1 item, 1 sound")
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      const latestViewportProps = viewportWiringHarness.viewportPropsSpy.mock.calls[
        viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1
      ]?.[0] as {
        externalSceneSeed?: {
          sceneId?: string;
          width?: number;
          height?: number;
          backendUpdatedAt?: string;
          previewImageUrl?: string;
          textureAtlas?: {
            atlasId?: string;
            cacheKey?: string;
            strategy?: string;
            objectKey?: string;
            contentType?: string;
            sizeBytes?: number;
          };
          composition?: {
            placeables: number;
            doors: number;
            creatures: number;
            items: number;
            sounds: number;
            total: number;
          };
          objects?: Array<{
            id: string;
            kind: string;
            resRef?: string;
            soundPositioning?: {
              mode?: string;
              maxVolumeDistance?: number;
              cutoffDistance?: number;
              preserve?: {
                playStyle?: string;
                flags?: Record<string, boolean>;
                extra?: Record<string, unknown>;
              };
            };
          }>;
        } | null;
      };

      expect(latestViewportProps.externalSceneSeed).toMatchObject({
        sceneId: "area_count_fidelity",
        width: 4,
        height: 3,
        backendUpdatedAt: "2026-06-16T20:00:00.000Z",
        previewImageUrl: "/preview/area_count_fidelity.webp",
        textureAtlas: {
          atlasId: "atlas_area_count_fidelity",
          cacheKey: "atlas_area_count_fidelity:4x3",
          strategy: "blob-cache",
          objectKey: "modules/current/areas/atlases/atlas_area_count_fidelity.webp",
          contentType: "image/webp",
          sizeBytes: 8192
        },
        composition: {
          placeables: 1,
          doors: 1,
          creatures: 1,
          items: 1,
          sounds: 1,
          total: 5
        }
      });
      expect(latestViewportProps.externalSceneSeed?.objects).toHaveLength(5);
      expect(latestViewportProps.externalSceneSeed?.objects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "area_count_fidelity:plc_01", kind: "placeables" }),
          expect.objectContaining({ id: "area_count_fidelity:door_01", kind: "doors" }),
          expect.objectContaining({ id: "area_count_fidelity:creature_01", kind: "creatures" }),
          expect.objectContaining({ id: "area_count_fidelity:item_01", kind: "items" }),
          expect.objectContaining({
            id: "area_count_fidelity:sound_01",
            kind: "sounds",
            resRef: "amb_city_market_day"
          })
        ])
      );
      expect(
        latestViewportProps.externalSceneSeed?.objects?.find(
          (object) => object.id === "area_count_fidelity:sound_01"
        )?.soundPositioning
      ).toMatchObject({
        mode: "specific",
        maxVolumeDistance: 2,
        cutoffDistance: 12,
        preserve: {
          playStyle: "loop",
          flags: {
            active: true,
            positional: true
          },
          extra: {
            backendSoundId: "sound_ambient_city_market_001",
            soundTemplateSource: "area-payload"
          }
        }
      });
    });
  });

  it("forwards area open loading state to the canvas while area detail is pending", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    let resolveAreaDetail!: (detail: AreaApiDetail) => void;
    const areaDetailPromise = new Promise<AreaApiDetail>((resolve) => {
      resolveAreaDetail = resolve;
    });
    const delayedAreaPort: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_alpha",
            name: "Area Alpha",
            objectCounts: {
              placeables: 2,
              doors: 1,
              creatures: 1,
              items: 0,
              sounds: 1,
              total: 5
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(() => areaDetailPromise)
    };
    attachProcessAreaFromDetail(delayedAreaPort);

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={delayedAreaPort}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      const latestViewportProps = viewportWiringHarness.viewportPropsSpy.mock.calls[
        viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1
      ]?.[0] as {
        areaCanvasLoading?: {
          source?: string;
          label?: string;
          completed?: number | null;
          total?: number | null;
        } | null;
      };
      expect(latestViewportProps.areaCanvasLoading).toMatchObject({
        source: "areas",
        label: "Opening Area Alpha",
        completed: 0,
        total: 5
      });
    });

    await act(async () => {
      resolveAreaDetail(buildAreaDetailFixture({
        areaId: "area_alpha",
        name: "Area Alpha",
        objects: []
      }));
    });

    await waitFor(() => {
      const latestViewportProps = viewportWiringHarness.viewportPropsSpy.mock.calls[
        viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1
      ]?.[0] as {
        areaCanvasLoading?: unknown;
      };
      expect(latestViewportProps.areaCanvasLoading).toBeNull();
    });
  });

  it("loads area placeable payloads in areas mode and forwards them mapped by object id", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceable = vi.fn(async (_accessToken: string, payload: { templateId?: string }) => {
      const templateId = payload.templateId ?? "plc_unknown";
      return {
        cacheKey: `cache_key_${templateId}`,
        cacheHit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0,
        placeable: {
          templateId,
          resref: `resref_${templateId}`,
          name: templateId.toUpperCase(),
          category: "placeables",
          placeableSubtype: "generic" as const,
          render: {
            backendType: "generic" as const,
            frontendType: "placeable" as const,
            rendererPreset: "default",
            isDoor: false,
            isVfx: false
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-01-01T00:00:00.000Z",
            assetCount: 2,
            candidatesScanned: 2,
            assets: [
              {
                assetId: `asset_model_${templateId}`,
                role: "model" as const,
                fileName: `${templateId}.mdl`,
                objectKey: `objects/${templateId}.mdl`,
                extension: "mdl",
                sizeBytes: 1234,
                contentType: "application/octet-stream"
              },
              {
                assetId: `asset_texture_${templateId}`,
                role: "texture" as const,
                fileName: `${templateId}.tga`,
                objectKey: `objects/${templateId}.tga`,
                extension: "tga",
                sizeBytes: 4321,
                contentType: "image/x-tga"
              }
            ]
          }
        }
      };
    });
    const getPlaceableAssetContracts = vi.fn(
      async (_accessToken: string, cacheKey: string, assetIds?: string[]) => ({
        cacheKey,
        assets: (assetIds ?? []).map((assetId) => ({
          assetId,
          objectKey: `objects/${assetId}`,
          contentType: assetId.includes("texture") ? "image/x-tga" : "application/octet-stream",
          sizeBytes: 512,
          deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`,
          deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`
        }))
      })
    );
    const areaPortWithPlaceables: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_alpha",
            name: "Area Alpha",
            biome: "urban",
            width: 3,
            height: 3,
            tags: [],
            benchmark: false,
            updatedAt: "2026-01-01T00:00:00.000Z"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_alpha",
        name: "Area Alpha",
        biome: "urban",
        width: 3,
        height: 3,
        tags: [],
        benchmark: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
        objects: [
          {
            objectId: "plc_01",
            kind: "placeable",
            templateId: "plc_area_table_01",
            x: 1,
            y: 1,
            z: 0,
            bearing: 180
          }
        ]
      }))
    };
    attachProcessAreaFromDetail(areaPortWithPlaceables);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceable,
      getPlaceableAssetContracts
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithPlaceables}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      expect(processPlaceable).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          templateId: "plc_area_table_01",
          resref: "plc_area_table_01",
          subtypeHint: "generic",
          includeBenchmarkMetadata: false
        }),
        { signal: expect.any(AbortSignal) }
      );
    });

    const lastViewportCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const lastViewportProps = (lastViewportCall?.[0] ??
      {}) as {
      placeableRenderPayloadByObjectId?: Record<string, { templateId: string; cacheKey: string }>;
    };

    expect(
      lastViewportProps.placeableRenderPayloadByObjectId
    ).toEqual(
      expect.objectContaining({
        ["area_alpha:plc_01"]: expect.objectContaining({
          templateId: "plc_area_table_01",
          cacheKey: "cache_key_plc_area_table_01"
        })
      })
    );
    expect(getPlaceableAssetContracts).toHaveBeenCalledWith(
      "token",
      "cache_key_plc_area_table_01",
      expect.arrayContaining([
        "asset_model_plc_area_table_01",
        "asset_texture_plc_area_table_01"
      ]),
      { signal: expect.any(AbortSignal) }
    );
  });

  it("loads area placeable payloads by resref when area object template ids are raw Aurora resrefs", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceable = vi.fn(async (_accessToken: string, payload: { templateId?: string; resref?: string }) => {
      const resolvedTemplateId =
        payload.resref === "zep_tomest_001" ? "plc_zep_tomest_001" : (payload.templateId ?? "plc_unknown");
      return {
        cacheKey: `cache_key_${resolvedTemplateId}`,
        cacheHit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0,
        placeable: {
          templateId: resolvedTemplateId,
          resref: payload.resref ?? resolvedTemplateId,
          name: resolvedTemplateId.toUpperCase(),
          category: "placeables",
          placeableSubtype: "generic" as const,
          render: {
            backendType: "generic" as const,
            frontendType: "placeable" as const,
            rendererPreset: "default",
            isDoor: false,
            isVfx: false
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-01-01T00:00:00.000Z",
            assetCount: 1,
            candidatesScanned: 1,
            assets: [
              {
                assetId: `asset_model_${resolvedTemplateId}`,
                role: "model" as const,
                fileName: `${resolvedTemplateId}.glb`,
                objectKey: `objects/${resolvedTemplateId}.glb`,
                extension: "glb",
                sizeBytes: 1234,
                contentType: "model/gltf-binary"
              }
            ]
          }
        }
      };
    });
    const getPlaceableAssetContracts = vi.fn(
      async (_accessToken: string, cacheKey: string, assetIds?: string[]) => ({
        cacheKey,
        assets: (assetIds ?? []).map((assetId) => ({
          assetId,
          objectKey: `objects/${assetId}`,
          contentType: "model/gltf-binary",
          sizeBytes: 512,
          deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`,
          deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`
        }))
      })
    );
    const areaPortWithRawResrefPlaceable: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_alpha",
            name: "Area Alpha",
            biome: "urban",
            width: 3,
            height: 3,
            tags: [],
            benchmark: false,
            updatedAt: "2026-01-01T00:00:00.000Z"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_alpha",
        name: "Area Alpha",
        biome: "urban",
        width: 3,
        height: 3,
        tags: [],
        benchmark: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
        objects: [
          {
            objectId: "plc_01",
            kind: "placeable",
            templateId: "zep_tomest_001",
            x: 1,
            y: 1,
            z: 0,
            bearing: 180
          }
        ]
      }))
    };
    attachProcessAreaFromDetail(areaPortWithRawResrefPlaceable);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceable,
      getPlaceableAssetContracts
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithRawResrefPlaceable}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      expect(processPlaceable).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          templateId: "zep_tomest_001",
          resref: "zep_tomest_001",
          subtypeHint: "generic",
          includeBenchmarkMetadata: false
        }),
        { signal: expect.any(AbortSignal) }
      );
    });

    const lastViewportCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const lastViewportProps = (lastViewportCall?.[0] ??
      {}) as {
      placeableRenderPayloadByObjectId?: Record<string, { templateId: string; cacheKey: string }>;
    };

    expect(
      lastViewportProps.placeableRenderPayloadByObjectId
    ).toEqual(
      expect.objectContaining({
        ["area_alpha:plc_01"]: expect.objectContaining({
          templateId: "plc_zep_tomest_001",
          cacheKey: "cache_key_plc_zep_tomest_001"
        })
      })
    );
  });

  it("dedupes Area GIT placeable render payload batches by render facts and fans out by object id", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceables = vi.fn(async (_accessToken: string, payloads: Array<{ templateId?: string }>) => ({
      items: payloads.map((payload) => {
        const templateId = payload.templateId ?? "plc_unknown";
        return {
          cacheKey: `cache_key_${templateId}`,
          cacheHit: false,
          storedAt: "2026-01-01T00:00:00.000Z",
          hits: 0,
          placeable: {
            templateId,
            resref: templateId,
            name: templateId.toUpperCase(),
            category: "placeables",
            placeableSubtype: "generic" as const,
            render: {
              backendType: "generic" as const,
              frontendType: "placeable" as const,
              rendererPreset: "default",
              isDoor: false,
              isVfx: false
            },
            assetManifest: {
              version: "placeable-asset-manifest/v1" as const,
              source: "module-blob-snapshot" as const,
              generatedAt: "2026-01-01T00:00:00.000Z",
              assetCount: 0,
              candidatesScanned: 0,
              assets: []
            }
          }
        };
      })
    }));
    const areaPortWithDuplicateRenderFacts: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_ikea",
            name: "_IKEA",
            objectCounts: {
              placeables: 2,
              doors: 0,
              creatures: 0,
              items: 0,
              sounds: 0,
              total: 2
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_ikea",
        name: "_IKEA",
        objects: [
          {
            objectId: "plc_01",
            kind: "placeable",
            templateId: "zep_tomest_001",
            x: 1,
            y: 1,
            z: 0,
            bearing: 0,
            appearanceType: 104
          },
          {
            objectId: "plc_02",
            kind: "placeable",
            templateId: "zep_tomest_001",
            x: 2,
            y: 1,
            z: 0,
            bearing: 90,
            appearanceType: 104
          }
        ]
      }))
    };
    attachProcessAreaFromDetail(areaPortWithDuplicateRenderFacts);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceables
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithDuplicateRenderFacts}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      expect(processPlaceables).toHaveBeenCalledTimes(1);
      expect(processPlaceables).toHaveBeenCalledWith(
        "token",
        [
          expect.objectContaining({
            templateId: "zep_tomest_001",
            resref: "zep_tomest_001",
            subtypeHint: "generic",
            appearanceType: 104,
            includeBenchmarkMetadata: false
          })
        ],
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    await waitFor(() => {
      const lastViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const lastViewportProps = (lastViewportCall?.[0] ??
        {}) as {
        areaCanvasLoading?: unknown;
        placeableRenderPayloadByObjectId?: Record<string, { templateId: string; cacheKey: string }>;
      };

      expect(lastViewportProps.areaCanvasLoading).toBeNull();
      expect(lastViewportProps.placeableRenderPayloadByObjectId).toEqual(
        expect.objectContaining({
          ["area_ikea:plc_01"]: expect.objectContaining({
            templateId: "zep_tomest_001",
            cacheKey: "cache_key_zep_tomest_001"
          }),
          ["area_ikea:plc_02"]: expect.objectContaining({
            templateId: "zep_tomest_001",
            cacheKey: "cache_key_zep_tomest_001"
          })
        })
      );
    });

    const workspaceLayout = screen.getByRole("region", { name: /workspace layout/i });
    expect(workspaceLayout).toHaveAttribute(
      "data-area-placeable-render-payload-queue-status",
      "ready"
    );
    expect(workspaceLayout).toHaveAttribute(
      "data-area-placeable-render-payload-queue-mode",
      "batch"
    );
    expect(
      JSON.parse(
        workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ?? "{}"
      )
    ).toMatchObject({
      rendererPath: "shared-placeables-renderer",
      status: "ready",
      queueMode: "batch",
      objectCount: 2,
      lookupCount: 1,
      payloadReadyLookupCount: 1,
      stillLoadingLookupCount: 0,
      missingPayloadCount: 0
    });
  });

  it("revalidates before publishing on Area reopen and recovers once from a later renderer cache miss", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    type ProcessBatchResult = Awaited<
      ReturnType<NonNullable<PlaceableApiPort["processPlaceables"]>>
    >;
    let resolveReopenedBatch: ((result: ProcessBatchResult) => void) | null = null;
    let resolveCacheMissBatch: ((result: ProcessBatchResult) => void) | null = null;
    const buildProcessBatchResult = (cacheKey: string): ProcessBatchResult => ({
      items: [
        {
          cacheKey,
          cacheHit: false,
          storedAt: "2026-01-01T00:00:00.000Z",
          hits: 0,
          placeable: {
            templateId: "plc_revalidated",
            resref: "plc_revalidated",
            name: "PLC_REVALIDATED",
            category: "placeables",
            placeableSubtype: "generic" as const,
            render: {
              backendType: "generic" as const,
              frontendType: "placeable" as const,
              rendererPreset: "default",
              isDoor: false,
              isVfx: false
            },
            assetManifest: {
              version: "placeable-asset-manifest/v1" as const,
              source: "module-blob-snapshot" as const,
              generatedAt: "2026-01-01T00:00:00.000Z",
              assetCount: 0,
              candidatesScanned: 0,
              assets: []
            }
          }
        }
      ]
    });
    const processPlaceables = vi.fn(
      async (): Promise<ProcessBatchResult> => {
        if (processPlaceables.mock.calls.length === 1) {
          return buildProcessBatchResult("cache_before_backend_restart");
        }
        return new Promise<ProcessBatchResult>((resolve) => {
          if (processPlaceables.mock.calls.length === 2) {
            resolveReopenedBatch = resolve;
            return;
          }
          resolveCacheMissBatch = resolve;
        });
      }
    );
    const areaPort: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_revalidate",
            name: "Area Revalidate"
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () =>
        buildAreaDetailFixture({
          areaId: "area_revalidate",
          name: "Area Revalidate",
          objects: [
            {
              objectId: "plc_revalidated",
              kind: "placeable",
              templateId: "plc_revalidated",
              x: 1,
              y: 1,
              z: 0,
              bearing: 0,
              appearanceType: 104
            }
          ]
        })
      )
    };
    attachProcessAreaFromDetail(areaPort);
    const openProductionAreaAsDraft = vi.fn(async () => {
      const sourceArea = {
        ...(await areaPort.getAreaById("token", "area_revalidate")),
        tiles: []
      };
      return {
        ok: true as const,
        value: {
          draftId: "draft_revalidate_abcdef0123456789abcdef",
          title: "Area Revalidate - Working Copy",
          revision: 1,
          updatedAt: "2026-01-01T00:00:00.000Z",
          draft: {
            schemaVersion: "area-draft.v1" as const,
            title: "Area Revalidate - Working Copy",
            source: { type: "production_area" as const, areaId: "area_revalidate" },
            payload: {
              schemaVersion: "production-area-draft-payload.v1" as const,
              sourceArea,
              provenance: {
                areaId: "area_revalidate",
                sourceUpdatedAt: sourceArea.updatedAt,
                processingCacheKey: "area_revalidate_source_cache"
              }
            }
          }
        },
        metadata: {
          contractVersion: "1.1.0",
          requestId: "request-revalidate",
          revision: 1,
          etag: '"1"',
          idempotencyStatus: "created" as const,
          artifactIds: []
        }
      };
    });
    const areaLifecycleFacade = {
      queries: {
        listLocalDrafts: vi.fn(async () => ({
          ok: true as const,
          value: { items: [], nextCursor: null },
          metadata: { contractVersion: "1.1.0", requestId: "request-draft-list" }
        })),
        openLocalDraft: vi.fn()
      },
      commands: {
        openProductionAreaAsDraft,
        saveLocalDraft: vi.fn(),
        deleteLocalDraft: vi.fn(),
        materializeArea: vi.fn()
      }
    } as unknown as AreaLifecycleFacade;
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceables
    };

    const { container } = render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPort}
        areaLifecycleFacade={areaLifecycleFacade}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect((await screen.findAllByText("Area Revalidate")).length).toBeGreaterThan(0);
    const areaRow = container.querySelector<HTMLButtonElement>('[data-area-id="area_revalidate"]');
    expect(areaRow).not.toBeNull();
    fireEvent.click(areaRow!);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));
    await waitFor(() =>
      expect(screen.getByRole("region", { name: /workspace canvas/i }))
        .toHaveAttribute("data-external-scene-id", "area_revalidate")
    );
    await waitFor(() => expect(processPlaceables).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const lastCall = viewportWiringHarness.viewportPropsSpy.mock.calls.at(-1)?.[0] as {
        placeableRenderPayloadByObjectId?: Record<string, { cacheKey: string }> | null;
      };
      expect(lastCall.placeableRenderPayloadByObjectId?.["area_revalidate:plc_revalidated"])
        .toMatchObject({ cacheKey: "cache_before_backend_restart" });
    });

    fireEvent.click(areaRow!);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));
    await waitFor(() => expect(processPlaceables).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("region", { name: /workspace layout/i })).toHaveAttribute(
      "data-area-placeable-render-payload-validation-generation",
      "2"
    );
    const reopenPendingCall = viewportWiringHarness.viewportPropsSpy.mock.calls.at(-1)?.[0] as {
      placeableRenderPayloadByObjectId?: Record<string, { cacheKey: string }> | null;
    };
    expect(reopenPendingCall.placeableRenderPayloadByObjectId).toBeNull();

    await act(async () => {
      resolveReopenedBatch?.(buildProcessBatchResult("cache_after_backend_restart"));
    });
    await waitFor(() => {
      const lastCall = viewportWiringHarness.viewportPropsSpy.mock.calls.at(-1)?.[0] as {
        placeableRenderPayloadByObjectId?: Record<string, { cacheKey: string }> | null;
      };
      expect(lastCall.placeableRenderPayloadByObjectId?.["area_revalidate:plc_revalidated"])
        .toMatchObject({ cacheKey: "cache_after_backend_restart" });
    });

    const loadedViewportProps = viewportWiringHarness.viewportPropsSpy.mock.calls.at(-1)?.[0] as {
      onPlaceableAssetCacheMiss?: (detail: {
        cacheKey: string;
        url: string;
        status: number;
        assetKind: "model" | "texture";
        code: "PLACEABLE_CACHE_NOT_FOUND";
      }) => void;
    };
    await act(async () => {
      loadedViewportProps.onPlaceableAssetCacheMiss?.({
        cacheKey: "cache_after_backend_restart",
        url: "/api/v1/catalog/placeables/cache/cache_after_backend_restart/assets/model.glb",
        status: 404,
        assetKind: "model",
        code: "PLACEABLE_CACHE_NOT_FOUND"
      });
    });
    await waitFor(() => expect(processPlaceables).toHaveBeenCalledTimes(3));
    expect(screen.getByRole("region", { name: /workspace layout/i })).toHaveAttribute(
      "data-area-placeable-render-payload-validation-generation",
      "3"
    );
    const pendingCall = viewportWiringHarness.viewportPropsSpy.mock.calls.at(-1)?.[0] as {
      placeableRenderPayloadByObjectId?: Record<string, { cacheKey: string }> | null;
    };
    expect(pendingCall.placeableRenderPayloadByObjectId).toBeNull();

    await act(async () => {
      resolveCacheMissBatch?.(buildProcessBatchResult("cache_after_cache_miss_recovery"));
    });
    await waitFor(() => {
      const lastCall = viewportWiringHarness.viewportPropsSpy.mock.calls.at(-1)?.[0] as {
        placeableRenderPayloadByObjectId?: Record<string, { cacheKey: string }> | null;
      };
      expect(lastCall.placeableRenderPayloadByObjectId?.["area_revalidate:plc_revalidated"])
        .toMatchObject({ cacheKey: "cache_after_cache_miss_recovery" });
    });
  });

  it("skips Area GIT placeable render payload batches during terrain-only runtime capture", async () => {
    (window as AreasRuntimeCaptureWindow)
      .__AURORA_AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY__ = true;
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const trackTelemetryEvent = vi.fn();
    const processPlaceables = vi.fn(async () => ({ items: [] }));
    const processPlaceable = vi.fn(placeableApiPortStub.processPlaceable);
    const areaPortWithPlaceable: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_tile_only_capture",
            name: "Tile Only Capture",
            objectCounts: {
              placeables: 1,
              doors: 0,
              creatures: 0,
              items: 0,
              sounds: 0,
              total: 1
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_tile_only_capture",
        name: "Tile Only Capture",
        objects: [
          {
            objectId: "plc_terrain_only",
            kind: "placeable",
            templateId: "zep_tomest_001",
            x: 1,
            y: 1,
            z: 0,
            bearing: 90,
            appearanceType: 104
          }
        ]
      }))
    };
    attachProcessAreaFromDetail(areaPortWithPlaceable);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [],
        total: 0,
        limit: 1000,
        offset: 0
      })),
      processPlaceable,
      processPlaceables
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithPlaceable}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    const workspaceLayout = screen.getByRole("region", { name: /workspace layout/i });
    await waitFor(() => {
      expect(workspaceLayout).toHaveAttribute(
        "data-area-runtime-capture-terrain-only-object-payload-skip",
        "true"
      );
      expect(workspaceLayout).toHaveAttribute(
        "data-area-placeable-render-payload-queue-mode",
        "unavailable"
      );
      expect(
        JSON.parse(
          workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ??
            "{}"
        )
      ).toMatchObject({
        rendererPath: "shared-placeables-renderer",
        status: "blocked",
        placeholderStatus: "blocked",
        queueMode: "unavailable",
        objectCount: 1,
        lookupCount: 1,
        payloadReadyLookupCount: 0,
        stillLoadingLookupCount: 0,
        missingPayloadCount: 1
      });
    });

    expect(processPlaceables).not.toHaveBeenCalled();
    expect(processPlaceable).not.toHaveBeenCalled();
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.areas_mode.render_payload_queue_skipped",
      expect.objectContaining({
        rendererPath: "shared-placeables-renderer",
        objectCount: 1,
        lookupCount: 1,
        reason: "terrain_only_runtime_capture"
      })
    );
  });

  it("loads Area GIT placeable render payloads in progressive 128 item batches with one bounded batch worker", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    type ProcessPayload = {
      templateId?: string;
      resref?: string;
      appearanceType?: number;
      includeBenchmarkMetadata?: boolean;
    };
    type ProcessBatchResult = Awaited<ReturnType<NonNullable<PlaceableApiPort["processPlaceables"]>>>;
    const deferredBatches: Array<{
      payloads: ProcessPayload[];
      resolve: (result: ProcessBatchResult) => void;
    }> = [];
    const buildProcessBatchResult = (payloads: ProcessPayload[]): ProcessBatchResult => ({
      items: payloads.map((payload) => {
        const templateId = payload.templateId ?? "plc_unknown";
        return {
          cacheKey: `cache_key_${templateId}`,
          cacheHit: false,
          storedAt: "2026-01-01T00:00:00.000Z",
          hits: 0,
          placeable: {
            templateId,
            resref: payload.resref ?? templateId,
            name: templateId.toUpperCase(),
            category: "placeables",
            placeableSubtype: "generic" as const,
            render: {
              backendType: "generic" as const,
              frontendType: "placeable" as const,
              rendererPreset: "default",
              isDoor: false,
              isVfx: false
            },
            assetManifest: {
              version: "placeable-asset-manifest/v1" as const,
              source: "module-blob-snapshot" as const,
              generatedAt: "2026-01-01T00:00:00.000Z",
              assetCount: 0,
              candidatesScanned: 0,
              assets: []
            }
          }
        };
      })
    });
    const processPlaceables = vi.fn(
      (_accessToken: string, payloads: ProcessPayload[]) =>
        new Promise<ProcessBatchResult>((resolve) => {
          deferredBatches.push({ payloads, resolve });
        })
    );
    const getPlaceableAssetContractsBatch = vi.fn(
      async (
        _accessToken: string,
        items: Array<{ cacheKey: string }>
      ) => ({
        items: items.map((item) => ({
          cacheKey: item.cacheKey,
          assets: []
        }))
      })
    );
    const getPlaceableViewportRenderPayloadBatch = vi.fn(async () => {
      throw new Error("Area GIT payload queue must not use backend viewport render-payload batch");
    });
    const areaObjects = Array.from({ length: 129 }, (_unused, index) => ({
      objectId: `plc_progress_${String(index).padStart(2, "0")}`,
      kind: "placeable" as const,
      templateId: `plc_progress_${String(index).padStart(2, "0")}`,
      x: index % 8,
      y: Math.floor(index / 8),
      z: 0,
      bearing: 0,
      appearanceType: 2000 + index
    }));
    const areaPortWithProgressivePlaceables: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_progressive",
            name: "Area Progressive",
            objectCounts: {
              placeables: areaObjects.length,
              doors: 0,
              creatures: 0,
              items: 0,
              sounds: 0,
              total: areaObjects.length
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_progressive",
        name: "Area Progressive",
        objects: areaObjects
      }))
    };
    attachProcessAreaFromDetail(areaPortWithProgressivePlaceables);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceables,
      getPlaceableAssetContractsBatch,
      getPlaceableViewportRenderPayloadBatch
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithProgressivePlaceables}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    const workspaceLayout = screen.getByRole("region", { name: /workspace layout/i });
    const readLatestAreaCanvasLoading = () => {
      const latestViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const latestViewportProps = (latestViewportCall?.[0] ?? {}) as {
        areaCanvasLoading?: {
          source?: string;
          label?: string;
          completed?: number | null;
          total?: number | null;
          inFlight?: number | null;
          queued?: number | null;
          currentLabel?: string | null;
        } | null;
      };
      return latestViewportProps.areaCanvasLoading;
    };
    await waitFor(() => expect(processPlaceables).toHaveBeenCalledTimes(1));
    expect(getPlaceableViewportRenderPayloadBatch).toHaveBeenCalled();
    expect(processPlaceables.mock.calls[0]?.[1]).toHaveLength(128);

    await waitFor(() => {
      expect(
        JSON.parse(
          workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ?? "{}"
        )
      ).toMatchObject({
        rendererPath: "shared-placeables-renderer",
        status: "loading",
        queueMode: "batch",
        batchSize: 128,
        batchCount: 2,
        completedBatchCount: 0,
        lookupCount: 129,
        payloadReadyLookupCount: 0,
        stillLoadingLookupCount: 129,
        missingPayloadCount: 0
      });
      expect(readLatestAreaCanvasLoading()).toMatchObject({
        source: "areas",
        label: "Loading Area PLC/DOR render payloads",
        completed: 0,
        total: 129,
        inFlight: 128,
        queued: 1,
        currentLabel: "Area PLC/DOR payload batch 1/2"
      });
    });

    await act(async () => {
      deferredBatches[0]?.resolve(buildProcessBatchResult(deferredBatches[0].payloads));
    });

    await waitFor(() => {
      expect(processPlaceables).toHaveBeenCalledTimes(2);
      expect(getPlaceableViewportRenderPayloadBatch).toHaveBeenCalled();
      expect(processPlaceables.mock.calls[1]?.[1]).toHaveLength(1);
      expect(
        JSON.parse(
          workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ?? "{}"
        )
      ).toMatchObject({
        rendererPath: "shared-placeables-renderer",
        status: "loading",
        queueMode: "batch",
        batchSize: 128,
        batchCount: 2,
        completedBatchCount: 1,
        lookupCount: 129,
        payloadReadyLookupCount: 128,
        stillLoadingLookupCount: 1,
        missingPayloadCount: 0
      });
      expect(readLatestAreaCanvasLoading()).toMatchObject({
        source: "areas",
        label: "Loading Area PLC/DOR render payloads",
        completed: 128,
        total: 129,
        inFlight: 1,
        queued: 0,
        currentLabel: "Area PLC/DOR payload batch 2/2"
      });
    });

    await act(async () => {
      deferredBatches[1]?.resolve(buildProcessBatchResult(deferredBatches[1].payloads));
    });

    await waitFor(() => {
      const snapshot = JSON.parse(
        workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ?? "{}"
      );
      expect(snapshot).toMatchObject({
        rendererPath: "shared-placeables-renderer",
        status: "ready",
        queueMode: "batch",
        batchSize: 128,
        batchCount: 2,
        completedBatchCount: 2,
        lookupCount: 129,
        payloadReadyLookupCount: 129,
        stillLoadingLookupCount: 0,
        missingPayloadCount: 0
      });
      expect(readLatestAreaCanvasLoading()).toBeNull();
    });
    expect(getPlaceableViewportRenderPayloadBatch).toHaveBeenCalled();
  });

  it("recovers Area GIT placeable render payloads that are missing from a completed batch response", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const buildReadyProcessResult = (templateId: string) => {
      const assetId = `${templateId}_model_asset`;
      return {
        cacheKey: `cache_key_${templateId}`,
        cacheHit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0,
        placeable: {
          templateId,
          resref: templateId,
          name: templateId.toUpperCase(),
          category: "placeables",
          placeableSubtype: "generic" as const,
          render: {
            backendType: "generic" as const,
            frontendType: "placeable" as const,
            rendererPreset: "default",
            isDoor: false,
            isVfx: false
          },
          renderPackage: {
            status: "ready" as const,
            diagnostics: [],
            assetRefs: {
              derivedModelAssetIds: [assetId]
            }
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-01-01T00:00:00.000Z",
            assetCount: 1,
            candidatesScanned: 1,
            assets: [
              {
                assetId,
                role: "model" as const,
                fileName: `${templateId}.glb`,
                objectKey: `objects/${templateId}.glb`,
                extension: "glb",
                sizeBytes: 1024,
                contentType: "model/gltf-binary"
              }
            ]
          }
        }
      };
    };
    const buildAssetContracts = (cacheKey: string, templateId: string) => ({
      cacheKey,
      assets: [
        {
          assetId: `${templateId}_model_asset`,
          objectKey: `objects/${templateId}.glb`,
          contentType: "model/gltf-binary",
          sizeBytes: 1024,
          deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${templateId}_model_asset.glb`,
          deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${templateId}_model_asset.glb`
        }
      ]
    });
    const processPlaceables = vi.fn(async (_accessToken: string, payloads: Array<{ templateId?: string }>) => ({
      items: [buildReadyProcessResult(payloads[0]?.templateId ?? "plc_missing_first")]
    }));
    const processPlaceable = vi.fn(async (_accessToken: string, payload: { templateId?: string }) =>
      buildReadyProcessResult(payload.templateId ?? "plc_missing_single")
    );
    const getPlaceableAssetContractsBatch = vi.fn(
      async (_accessToken: string, items: Array<{ cacheKey: string }>) => ({
        items: items.map((item) => {
          const templateId = item.cacheKey.replace(/^cache_key_/u, "");
          return buildAssetContracts(item.cacheKey, templateId);
        })
      })
    );
    const getPlaceableAssetContracts = vi.fn(async (_accessToken: string, cacheKey: string) => {
      const templateId = cacheKey.replace(/^cache_key_/u, "");
      return buildAssetContracts(cacheKey, templateId);
    });
    const areaObjects = [
      {
        objectId: "plc_batch_ok",
        kind: "placeable" as const,
        templateId: "plc_batch_ok",
        x: 1,
        y: 1,
        z: 0,
        bearing: 0,
        appearanceType: 3100
      },
      {
        objectId: "plc_batch_missing",
        kind: "placeable" as const,
        templateId: "plc_batch_missing",
        x: 2,
        y: 1,
        z: 0,
        bearing: 0,
        appearanceType: 3101
      }
    ];
    const areaPortWithPartialBatch: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_partial_batch",
            name: "Area Partial Batch",
            objectCounts: {
              placeables: areaObjects.length,
              doors: 0,
              creatures: 0,
              items: 0,
              sounds: 0,
              total: areaObjects.length
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_partial_batch",
        name: "Area Partial Batch",
        objects: areaObjects
      }))
    };
    attachProcessAreaFromDetail(areaPortWithPartialBatch);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceable,
      processPlaceables,
      getPlaceableAssetContracts,
      getPlaceableAssetContractsBatch
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithPartialBatch}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      expect(processPlaceables).toHaveBeenCalledTimes(1);
      expect(processPlaceable).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          templateId: "plc_batch_missing",
          resref: "plc_batch_missing",
          subtypeHint: "generic",
          appearanceType: 3101,
          includeBenchmarkMetadata: false
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    const workspaceLayout = screen.getByRole("region", { name: /workspace layout/i });
    await waitFor(() => {
      const snapshot = JSON.parse(
        workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ?? "{}"
      );
      expect(snapshot).toMatchObject({
        rendererPath: "shared-placeables-renderer",
        status: "ready",
        queueMode: "batch",
        objectCount: 2,
        lookupCount: 2,
        payloadReadyLookupCount: 2,
        modelReadyLookupCount: 0,
        stillLoadingLookupCount: 0,
        missingPayloadCount: 0
      });
    });

    const lastViewportCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const lastViewportProps = (lastViewportCall?.[0] ??
      {}) as {
      placeableRenderPayloadByObjectId?: Record<string, { templateId: string; cacheKey: string }>;
    };
    expect(lastViewportProps.placeableRenderPayloadByObjectId).toEqual(
      expect.objectContaining({
        ["area_partial_batch:plc_batch_ok"]: expect.objectContaining({
          templateId: "plc_batch_ok",
          cacheKey: "cache_key_plc_batch_ok"
        }),
        ["area_partial_batch:plc_batch_missing"]: expect.objectContaining({
          templateId: "plc_batch_missing",
          cacheKey: "cache_key_plc_batch_missing"
        })
      })
    );
  });

  it("continues Area GIT single recovery past blocked asset contracts", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const areaObjects = Array.from({ length: 12 }, (_value, index) => ({
      objectId: `plc_tail_${index}`,
      kind: "placeable" as const,
      templateId: `plc_tail_${index}`,
      x: index,
      y: 1,
      z: 0,
      bearing: 0,
      appearanceType: 4100 + index
    }));
    const buildProcessResult = (templateId: string) => {
      const assetId = `${templateId}_model_asset`;
      const cacheKey = `cache_key_${templateId}`;
      return {
        cacheKey,
        cacheHit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0,
        placeable: {
          templateId,
          resref: templateId,
          name: templateId.toUpperCase(),
          category: "placeables",
          placeableSubtype: "generic" as const,
          render: {
            backendType: "generic" as const,
            frontendType: "placeable" as const,
            rendererPreset: "default",
            isDoor: false,
            isVfx: false
          },
          renderPackage: {
            status: "ready" as const,
            modelUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}.glb`,
            diagnostics: [],
            assetRefs: {
              derivedModelAssetIds: [assetId]
            }
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-01-01T00:00:00.000Z",
            assetCount: 1,
            candidatesScanned: 1,
            assets: [
              {
                assetId,
                role: "model" as const,
                fileName: `${templateId}.glb`,
                objectKey: `objects/${templateId}.glb`,
                extension: "glb",
                sizeBytes: 1024,
                contentType: "model/gltf-binary"
              }
            ]
          }
        }
      };
    };
    const processPlaceables = vi.fn(async (_accessToken: string, payloads: Array<{ templateId?: string }>) => ({
      items: [buildProcessResult(payloads[0]?.templateId ?? "plc_tail_0")]
    }));
    const processPlaceable = vi.fn(async (_accessToken: string, payload: { templateId?: string }) =>
      buildProcessResult(payload.templateId ?? "plc_tail_unknown")
    );
    const getPlaceableAssetContracts = vi.fn(
      async () => await new Promise<never>(() => undefined)
    );
    const getPlaceableAssetContractsBatch = vi.fn(
      async (_accessToken: string, items: Array<{ cacheKey: string }>) => ({
        items: items.map((item) => {
          const templateId = item.cacheKey.replace(/^cache_key_/u, "");
          return {
            cacheKey: item.cacheKey,
            assets: [
              {
                assetId: `${templateId}_model_asset`,
                objectKey: `objects/${templateId}.glb`,
                contentType: "model/gltf-binary",
                sizeBytes: 1024,
                deliveryPath: `/api/v1/catalog/placeables/cache/${item.cacheKey}/assets/${templateId}_model_asset.glb`,
                deliveryUrl: `/api/v1/catalog/placeables/cache/${item.cacheKey}/assets/${templateId}_model_asset.glb`
              }
            ]
          };
        })
      })
    );
    const areaPortWithTailRecoveryObjects: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area_tail_recovery",
            name: "Area Tail Recovery",
            objectCounts: {
              placeables: areaObjects.length,
              doors: 0,
              creatures: 0,
              items: 0,
              sounds: 0,
              total: areaObjects.length
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area_tail_recovery",
        name: "Area Tail Recovery",
        objects: areaObjects
      }))
    };
    attachProcessAreaFromDetail(areaPortWithTailRecoveryObjects);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceable,
      processPlaceables,
      getPlaceableAssetContracts,
      getPlaceableAssetContractsBatch
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithTailRecoveryObjects}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      expect(processPlaceables).toHaveBeenCalled();
      expect(processPlaceable).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          templateId: "plc_tail_11",
          resref: "plc_tail_11",
          subtypeHint: "generic",
          appearanceType: 4111,
          includeBenchmarkMetadata: false
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    const workspaceLayout = screen.getByRole("region", { name: /workspace layout/i });
    await waitFor(() => {
      const snapshot = JSON.parse(
        workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ?? "{}"
      );
      expect(snapshot).toMatchObject({
        rendererPath: "shared-placeables-renderer",
        status: "ready",
        queueMode: "batch",
        objectCount: areaObjects.length,
        lookupCount: areaObjects.length,
        payloadReadyLookupCount: areaObjects.length,
        modelReadyLookupCount: areaObjects.length,
        stillLoadingLookupCount: 0,
        missingPayloadCount: 0
      });
    });

    const lastViewportCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const lastViewportProps = (lastViewportCall?.[0] ??
      {}) as {
      placeableRenderPayloadByObjectId?: Record<string, { templateId: string; cacheKey: string }>;
    };
    expect(lastViewportProps.placeableRenderPayloadByObjectId).toEqual(
      expect.objectContaining({
        ["area_tail_recovery:plc_tail_11"]: expect.objectContaining({
          templateId: "plc_tail_11",
          cacheKey: "cache_key_plc_tail_11"
        })
      })
    );
  });

  it("keeps Area GIT batch process payloads bound when asset contracts are blocked", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceables = vi.fn(async (_accessToken: string, payloads: Array<{ templateId?: string }>) => ({
      items: payloads.map((payload) => {
        const templateId = payload.templateId ?? "plc_unknown";
        return {
          cacheKey: `backend_cache_${templateId}`,
          cacheHit: false,
          storedAt: "2026-01-01T00:00:00.000Z",
          hits: 0,
          placeable: {
            templateId,
            resref: templateId,
            name: templateId.toUpperCase(),
            category: "placeables",
            placeableSubtype: "generic" as const,
            render: {
              backendType: "generic" as const,
              frontendType: "placeable" as const,
              rendererPreset: "default",
              isDoor: false,
              isVfx: false
            },
            assetManifest: {
              version: "placeable-asset-manifest/v1" as const,
              source: "module-blob-snapshot" as const,
              generatedAt: "2026-01-01T00:00:00.000Z",
              assetCount: 1,
              candidatesScanned: 1,
              assets: [
                {
                  assetId: `asset_model_${templateId}`,
                  role: "model" as const,
                  fileName: `${templateId}.mdl`,
                  objectKey: `models/${templateId}.mdl`,
                  extension: "mdl",
                  sizeBytes: 1234,
                  contentType: "application/octet-stream"
                }
              ]
            }
          }
        };
      })
    }));
    const getPlaceableAssetContracts = vi.fn(async () => {
      throw new Error("lc_models mirror unavailable");
    });
    const areaPortWithIkeaPlaceable: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area__ikea",
            name: "_IKEA",
            objectCounts: {
              placeables: 1,
              doors: 0,
              creatures: 0,
              items: 0,
              sounds: 0,
              total: 1
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area__ikea",
        name: "_IKEA",
        objects: [
          {
            objectId: "obj_plc_nwic_desertplant_7",
            kind: "placeable",
            templateId: "nwic095",
            x: 6.1288,
            y: 3.7544,
            z: 0.5,
            bearing: 0,
            appearanceType: 7460
          }
        ]
      }))
    };
    attachProcessAreaFromDetail(areaPortWithIkeaPlaceable);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceables,
      getPlaceableAssetContracts
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithIkeaPlaceable}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      expect(processPlaceables).toHaveBeenCalledWith(
        "token",
        [
          expect.objectContaining({
            templateId: "nwic095",
            resref: "nwic095",
            subtypeHint: "generic",
            appearanceType: 7460,
            includeBenchmarkMetadata: false
          })
        ],
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    const workspaceLayout = screen.getByRole("region", { name: /workspace layout/i });
    await waitFor(() => {
      const latestViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const latestViewportProps = (latestViewportCall?.[0] ??
        {}) as {
        placeableRenderPayloadByObjectId?: Record<string, { templateId: string; cacheKey: string }>;
      };
      expect(latestViewportProps.placeableRenderPayloadByObjectId).toEqual(
        expect.objectContaining({
          ["area__ikea:obj_plc_nwic_desertplant_7"]: expect.objectContaining({
            templateId: "nwic095",
            cacheKey: "backend_cache_nwic095"
          })
        })
      );
      expect(workspaceLayout).toHaveAttribute(
        "data-area-placeable-render-payload-queue-status",
        "ready"
      );
      expect(workspaceLayout).toHaveAttribute(
        "data-area-placeable-render-payload-placeholder-status",
        "blocked"
      );
      expect(
        JSON.parse(
          workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ?? "{}"
        )
      ).toMatchObject({
        rendererPath: "shared-placeables-renderer",
        status: "ready",
        placeholderStatus: "blocked",
        queueMode: "batch",
        objectCount: 1,
        lookupCount: 1,
        payloadReadyLookupCount: 1,
        missingPayloadCount: 0,
        placeholderReasonCounts: expect.objectContaining({
          "asset-contract-blocked": 1,
          "missing-payload": 0
        })
      });
    });
  });

  it("keeps Area GIT single process payloads out of the renderer when asset contracts are blocked", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const processPlaceable = vi.fn(async (_accessToken: string, payload: { templateId?: string }) => {
      const templateId = payload.templateId ?? "plc_unknown";
      return {
        cacheKey: `backend_cache_${templateId}`,
        cacheHit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0,
        placeable: {
          templateId,
          resref: templateId,
          name: templateId.toUpperCase(),
          category: "placeables",
          placeableSubtype: "generic" as const,
          render: {
            backendType: "generic" as const,
            frontendType: "placeable" as const,
            rendererPreset: "default",
            isDoor: false,
            isVfx: false
          },
          assetManifest: {
            version: "placeable-asset-manifest/v1" as const,
            source: "module-blob-snapshot" as const,
            generatedAt: "2026-01-01T00:00:00.000Z",
            assetCount: 1,
            candidatesScanned: 1,
            assets: [
              {
                assetId: `asset_model_${templateId}`,
                role: "model" as const,
                fileName: `${templateId}.mdl`,
                objectKey: `models/${templateId}.mdl`,
                extension: "mdl",
                sizeBytes: 1234,
                contentType: "application/octet-stream"
              }
            ]
          }
        }
      };
    });
    const getPlaceableAssetContracts = vi.fn(async () => {
      throw new Error("lc_models mirror unavailable");
    });
    const areaPortWithIkeaPlaceable: AreaApiPort = {
      ...areaApiPortStub,
      listAreas: vi.fn(async () => ({
        items: [
          buildAreaListItemFixture({
            areaId: "area__ikea",
            name: "_IKEA",
            objectCounts: {
              placeables: 1,
              doors: 0,
              creatures: 0,
              items: 0,
              sounds: 0,
              total: 1
            }
          })
        ],
        total: 1,
        limit: 100,
        offset: 0
      })),
      getAreaById: vi.fn(async () => buildAreaDetailFixture({
        areaId: "area__ikea",
        name: "_IKEA",
        objects: [
          {
            objectId: "obj_plc_nwic_desertplant_7",
            kind: "placeable",
            templateId: "nwic095",
            x: 6.1288,
            y: 3.7544,
            z: 0.5,
            bearing: 0,
            appearanceType: 7460
          }
        ]
      }))
    };
    attachProcessAreaFromDetail(areaPortWithIkeaPlaceable);
    const flowPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      processPlaceable,
      getPlaceableAssetContracts,
      processPlaceables: undefined
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaPortWithIkeaPlaceable}
        placeableApiPort={flowPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /open selected area/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /open selected area/i }));

    await waitFor(() => {
      expect(processPlaceable).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          templateId: "nwic095",
          resref: "nwic095",
          subtypeHint: "generic",
          appearanceType: 7460,
          includeBenchmarkMetadata: false
        }),
        { signal: expect.any(AbortSignal) }
      );
    });

    const workspaceLayout = screen.getByRole("region", { name: /workspace layout/i });
    await waitFor(() => {
      const latestViewportCall =
        viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
      const latestViewportProps = (latestViewportCall?.[0] ??
        {}) as {
        placeableRenderPayloadByObjectId?: Record<string, { templateId: string; cacheKey: string }>;
      };
      expect(latestViewportProps.placeableRenderPayloadByObjectId).toBeNull();
      expect(workspaceLayout).toHaveAttribute(
        "data-area-placeable-render-payload-queue-status",
        "ready"
      );
      expect(workspaceLayout).toHaveAttribute(
        "data-area-placeable-render-payload-placeholder-status",
        "blocked"
      );
      expect(
        JSON.parse(
          workspaceLayout.getAttribute("data-area-placeable-render-payload-queue-snapshot") ?? "{}"
        )
      ).toMatchObject({
        rendererPath: "shared-placeables-renderer",
        status: "ready",
        placeholderStatus: "blocked",
        queueMode: "single",
        objectCount: 1,
        lookupCount: 1,
        payloadReadyLookupCount: 1,
        missingPayloadCount: 0,
        placeholderReasonCounts: expect.objectContaining({
          "asset-contract-blocked": 1,
          "missing-payload": 0
        })
      });
    });
  });

  it("preserves distinct templates when backend items share the same resref", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const sameResrefPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_shared_a",
            resref: "plc_shared",
            name: "PLC_SHARED_A",
            category: "placeables",
            placeableSubtype: "generic",
            tags: ["shared"],
            previewImageUrl: "/preview/plc_shared_a.png"
          },
          {
            templateId: "plc_shared_b",
            resref: "plc_shared",
            name: "PLC_SHARED_B",
            category: "placeables",
            placeableSubtype: "generic",
            tags: ["shared"],
            previewImageUrl: "/preview/plc_shared_b.png"
          }
        ],
        total: 2,
        limit: 100,
        offset: 0
      }))
    };

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={sameResrefPort}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    const placeablesList = await screen.findByRole("list", { name: /placeables mode list/i });
    expect(within(placeablesList).getAllByRole("button")).toHaveLength(2);
    expect(within(placeablesList).getByRole("button", { name: /plc_shared_a/i })).toBeInTheDocument();
    expect(within(placeablesList).getByRole("button", { name: /plc_shared_b/i })).toBeInTheDocument();
  });

  it("does not render workspace mode switch for non-builder roles", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="viewer"
        userId="u_viewer_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(screen.queryByRole("heading", { name: "Workspace Mode" })).not.toBeInTheDocument();
  });

  it("keeps areas mode behavior unchanged with no forced renderObjectIds", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    const lastCall =
      viewportWiringHarness.viewportPropsSpy.mock.calls[viewportWiringHarness.viewportPropsSpy.mock.calls.length - 1];
    const lastProps = lastCall?.[0] as {
      renderObjectIds?: string[] | null;
    };

    expect(lastProps.renderObjectIds ?? null).toBeNull();
  });

  it("does not fall back to local placeables when backend token is missing", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={null}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    expect(
      screen.getByText(/backend placeables catalog is unavailable\./i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /plc_/i })).not.toBeInTheDocument();
  });
});
