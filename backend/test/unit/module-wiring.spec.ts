import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AppModule } from "../../src/app.module";
import { HttpErrorFilter } from "../../src/common/http/http-error.filter";
import { RequestContextInterceptor } from "../../src/common/http/request-context.interceptor";
import { HealthModule } from "../../src/health/health.module";
import { AreasModule } from "../../src/modules/areas/areas.module";
import { AREA_PROCESSING_CACHE } from "../../src/modules/areas/application/ports/area-processing-cache.port";
import { ATOMIC_MODULE_SNAPSHOT_REPOSITORY } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import { AuthModule } from "../../src/modules/auth/auth.module";
import { AUTH_REPOSITORY } from "../../src/modules/auth/application/ports/auth-repository.port";
import { AccessGuard } from "../../src/modules/auth/adapters/inbound/http/access.guard";
import { CatalogModule } from "../../src/modules/catalog/catalog.module";
import { PLACEABLE_PROCESSING_CACHE } from "../../src/modules/catalog/application/ports/placeable-processing-cache.port";
import { ProcessingGraphModule } from "../../src/modules/processing-graph/processing-graph.module";
import { ProcessingJobsModule } from "../../src/modules/processing-jobs/processing-jobs.module";
import { PROCESSING_JOBS_PUBLISHER } from "../../src/modules/processing-jobs/application/ports/processing-jobs-publisher.port";
import { PROCESSING_JOBS_REPOSITORY } from "../../src/modules/processing-jobs/application/ports/processing-jobs-repository.port";
import { RuntimeSettingsModule } from "../../src/modules/runtime-settings/runtime-settings.module";
import { SoundsModule } from "../../src/modules/sounds/sounds.module";
import { SOUND_PROCESSING_CACHE } from "../../src/modules/sounds/application/ports/sound-processing-cache.port";
import { SOUND_REPOSITORY } from "../../src/modules/sounds/application/ports/sound-repository.port";
import { TilesModule } from "../../src/modules/tiles/tiles.module";
import { TILE_PROCESSING_CACHE } from "../../src/modules/tiles/application/ports/tile-processing-cache.port";
import { ModuleSnapshotsModule } from "../../src/modules/module-snapshots/module-snapshots.module";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { AreaTileCertificationQueryApplicationService } from "../../src/modules/areas/application/area-tile-certification-query.application.service";
import { AREA_TILE_PRODUCTION_ADMISSION } from "../../src/modules/areas/application/ports/area-tile-production-admission.port";
import { NWN_SCRIPT_COMPILER } from "../../src/modules/areas/application/ports/nwn-script-compiler.port";
import {
  DisabledNwnScriptCompilerAdapter,
  NwnScriptCompilerAdapter,
} from "../../src/modules/areas/adapters/outbound/compiler/nwn-script-compiler.adapter";
import { ModuleAreaEventScriptPublicationController } from "../../src/modules/areas/adapters/inbound/http/area-event-script-publication.controller";
import { AreaEventScriptPublicationApplicationService } from "../../src/modules/areas/application/area-event-script-publication.application.service";
import { AreaEventScriptPublicationRecoveryApplicationService } from "../../src/modules/areas/application/area-event-script-publication-recovery.application.service";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_IDEMPOTENCY,
  AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL,
} from "../../src/modules/areas/application/ports/area-event-script-publication.port";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_RECOVERY_STORAGE,
  AREA_EVENT_SCRIPT_PUBLICATION_STORAGE,
} from "../../src/modules/areas/application/ports/area-event-script-publication-storage.port";
import { NWN_SCRIPT_SOURCE_SNAPSHOT } from "../../src/modules/areas/application/ports/nwn-script-source-snapshot.port";
import { AREA_EVENT_SCRIPT_PUBLICATION_TELEMETRY } from "../../src/modules/areas/application/ports/area-event-script-publication-telemetry.port";
import { AREA_EVENT_SCRIPT_SOURCE_QUERY } from "../../src/modules/areas/application/ports/area-event-script-source-query.port";
import { NestAreaEventScriptPublicationTelemetryAdapter } from "../../src/modules/areas/adapters/outbound/telemetry/nest-area-event-script-publication-telemetry.adapter";

type ProviderEntry = {
  provide?: unknown;
  useClass?: unknown;
  useExisting?: unknown;
  useFactory?: (...args: any[]) => unknown;
};

describe("Module wiring", () => {
  it("re-exports imported snapshot providers through their Nest module", () => {
    const exports = Reflect.getMetadata("exports", AreasModule) as unknown[];

    expect(exports).toContain(ModuleSnapshotsModule);
    expect(exports).toContain(NWN_SCRIPT_COMPILER);
    expect(exports).not.toContain(ATOMIC_MODULE_SNAPSHOT_REPOSITORY);
  });

  it("keeps NWScript compilation disabled by default and selects the hash-bound provider explicitly", () => {
    const provider = getFactoryProvider(AreasModule, NWN_SCRIPT_COMPILER);
    expect(provider.useFactory?.({ nwnScriptCompilerConfigured: false }))
      .toBeInstanceOf(DisabledNwnScriptCompilerAdapter);
    expect(provider.useFactory?.({
      nwnScriptCompilerConfigured: true,
      nwnScriptCompilerPath: "C:/tools/nwn_script_comp.exe",
      nwnScriptCompilerSha256: "a".repeat(64),
      nwnScriptCompilerVersionMarker: "neverwinter 2.1.2",
      nwnScriptLanguageSpecPath: "C:/nwn/nwscript.nss",
      nwnScriptLanguageSpecSha256: "b".repeat(64),
      nwnScriptRuntimeLibraryDirectories: ["C:/runtime"],
      nwnScriptCompilerTimeoutMs: 10_000,
      nwnScriptCompilerOutputBytes: 64 * 1024,
      nwnScriptCompilerArtifactBytes: 4 * 1024 * 1024,
    })).toBeInstanceOf(NwnScriptCompilerAdapter);
  });

  it("aliases server tile materialization admission to the exact certification query service", () => {
    const providers = Reflect.getMetadata("providers", AreasModule) as ProviderEntry[];

    expect(providers.find((provider) =>
      provider.provide === AREA_TILE_PRODUCTION_ADMISSION
    )).toEqual({
      provide: AREA_TILE_PRODUCTION_ADMISSION,
      useExisting: AreaTileCertificationQueryApplicationService,
    });
  });

  it("wires publication, durable recovery, and the privileged script HTTP boundary", () => {
    const controllers = Reflect.getMetadata("controllers", AreasModule) as unknown[];
    const providers = Reflect.getMetadata("providers", AreasModule) as ProviderEntry[];

    expect(controllers).toContain(ModuleAreaEventScriptPublicationController);
    expect(getFactoryProvider(AreasModule, AreaEventScriptPublicationApplicationService))
      .toBeDefined();
    expect(providers).toContain(AreaEventScriptPublicationRecoveryApplicationService);
    expect(providers).toContain(NestAreaEventScriptPublicationTelemetryAdapter);
    expect(getFactoryProvider(AreasModule, NWN_SCRIPT_SOURCE_SNAPSHOT)).toBeDefined();
    expect(getFactoryProvider(AreasModule, AREA_EVENT_SCRIPT_SOURCE_QUERY)).toBeDefined();
    expect(getFactoryProvider(AreasModule, AREA_EVENT_SCRIPT_PUBLICATION_STORAGE)).toBeDefined();
    expect(providers).toEqual(expect.arrayContaining([
      expect.objectContaining({ provide: AREA_EVENT_SCRIPT_PUBLICATION_IDEMPOTENCY }),
      expect.objectContaining({ provide: AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL }),
      {
        provide: AREA_EVENT_SCRIPT_PUBLICATION_RECOVERY_STORAGE,
        useExisting: AREA_EVENT_SCRIPT_PUBLICATION_STORAGE,
      },
      {
        provide: AREA_EVENT_SCRIPT_PUBLICATION_TELEMETRY,
        useExisting: NestAreaEventScriptPublicationTelemetryAdapter,
      },
    ]));
  });

  it("registers app-level providers and imports", () => {
    const imports = Reflect.getMetadata("imports", AppModule) as unknown[];
    const providers = Reflect.getMetadata("providers", AppModule) as ProviderEntry[];

    expect(imports).toEqual(
      expect.arrayContaining([
        AuthModule,
        CatalogModule,
        TilesModule,
        SoundsModule,
        AreasModule,
        ProcessingGraphModule,
        ProcessingJobsModule,
        RuntimeSettingsModule,
        HealthModule
      ])
    );

    const filterProvider = providers.find((provider) => provider.provide === APP_FILTER);
    const interceptorProvider = providers.find(
      (provider) => provider.provide === APP_INTERCEPTOR
    );
    expect(filterProvider?.useClass).toBe(HttpErrorFilter);
    expect(interceptorProvider?.useClass).toBe(RequestContextInterceptor);
  });

  it("selects proper repository/cache providers in factories", () => {
    const catalogProvider = getFactoryProvider(CatalogModule, PLACEABLE_PROCESSING_CACHE);
    const areaProvider = getFactoryProvider(AreasModule, AREA_PROCESSING_CACHE);
    const atomicSnapshotProvider = getFactoryProvider(
      ModuleSnapshotsModule,
      ATOMIC_MODULE_SNAPSHOT_REPOSITORY
    );
    const tileProvider = getFactoryProvider(TilesModule, TILE_PROCESSING_CACHE);
    const soundRepositoryProvider = getFactoryProvider(SoundsModule, SOUND_REPOSITORY);
    const soundCacheProvider = getFactoryProvider(SoundsModule, SOUND_PROCESSING_CACHE);
    const authRepositoryProvider = getFactoryProvider(AuthModule, AUTH_REPOSITORY);
    const processingJobsRepositoryProvider = getFactoryProvider(
      ProcessingJobsModule,
      PROCESSING_JOBS_REPOSITORY
    );
    const processingJobsPublisherProvider = getFactoryProvider(
      ProcessingJobsModule,
      PROCESSING_JOBS_PUBLISHER
    );

    const layered = { name: "layered" };
    const memory = { name: "memory" };
    const snapshotRepo = { name: "snapshot" };
    const staticRepo = { name: "static" };
    const mysqlRepo = { name: "mysql" };
    const redisPublisher = { name: "redisPublisher" };
    const noopPublisher = { name: "noopPublisher" };

    expect(catalogProvider.useFactory?.({ useMemoryInfrastructure: true }, layered, memory)).toBe(memory);
    expect(catalogProvider.useFactory?.({ useMemoryInfrastructure: false }, layered, memory)).toBe(layered);

    expect(areaProvider.useFactory?.({ useMemoryInfrastructure: true }, layered, memory)).toBe(memory);
    expect(areaProvider.useFactory?.({ useMemoryInfrastructure: false }, layered, memory)).toBe(layered);
    expect(
      atomicSnapshotProvider.useFactory?.(
        { useMemoryInfrastructure: true },
        memory,
        mysqlRepo
      )
    ).toBeInstanceOf(MemoryAtomicModuleSnapshotRepository);
    expect(
      atomicSnapshotProvider.useFactory?.(
        { useMemoryInfrastructure: false },
        memory,
        mysqlRepo
      )
    ).toBe(mysqlRepo);

    expect(tileProvider.useFactory?.({ useMemoryInfrastructure: true }, layered, memory)).toBe(memory);
    expect(tileProvider.useFactory?.({ useMemoryInfrastructure: false }, layered, memory)).toBe(layered);

    expect(soundRepositoryProvider.useFactory?.({ isTest: true }, snapshotRepo, staticRepo)).toBe(
      staticRepo
    );
    expect(soundRepositoryProvider.useFactory?.({ isTest: false }, snapshotRepo, staticRepo)).toBe(
      snapshotRepo
    );

    expect(soundCacheProvider.useFactory?.({ useMemoryInfrastructure: true }, layered, memory)).toBe(memory);
    expect(soundCacheProvider.useFactory?.({ useMemoryInfrastructure: false }, layered, memory)).toBe(layered);

    expect(
      authRepositoryProvider.useFactory?.(
        {
          authRepositoryDriver: "memory"
        },
        memory,
        mysqlRepo
      )
    ).toBe(memory);
    expect(
      authRepositoryProvider.useFactory?.(
        {
          authRepositoryDriver: "mysql"
        },
        memory,
        mysqlRepo
      )
    ).toBe(mysqlRepo);
    expect(
      processingJobsRepositoryProvider.useFactory?.(
        { useMemoryInfrastructure: true },
        memory,
        mysqlRepo
      )
    ).toBe(memory);
    expect(
      processingJobsRepositoryProvider.useFactory?.(
        { useMemoryInfrastructure: false },
        memory,
        mysqlRepo
      )
    ).toBe(mysqlRepo);
    expect(
      processingJobsPublisherProvider.useFactory?.(
        { useMemoryInfrastructure: true },
        noopPublisher,
        redisPublisher
      )
    ).toBe(noopPublisher);
    expect(
      processingJobsPublisherProvider.useFactory?.(
        { useMemoryInfrastructure: false },
        noopPublisher,
        redisPublisher
      )
    ).toBe(redisPublisher);
  });

  it("registers auth guard provider", () => {
    const providers = Reflect.getMetadata("providers", AuthModule) as ProviderEntry[];
    const guardProvider = providers.find((provider) => provider.provide === APP_GUARD);
    expect(guardProvider?.useClass).toBe(AccessGuard);
  });
});

function getFactoryProvider(moduleClass: Function, token: unknown): ProviderEntry {
  const providers = Reflect.getMetadata("providers", moduleClass) as ProviderEntry[];
  const provider = providers.find((entry) => entry.provide === token);
  if (!provider || typeof provider.useFactory !== "function") {
    throw new Error(`Missing useFactory provider for ${String(token)}.`);
  }
  return provider;
}
