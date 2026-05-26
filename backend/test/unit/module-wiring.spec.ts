import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AppModule } from "../../src/app.module";
import { HttpErrorFilter } from "../../src/common/http/http-error.filter";
import { RequestContextInterceptor } from "../../src/common/http/request-context.interceptor";
import { HealthModule } from "../../src/health/health.module";
import { AreasModule } from "../../src/modules/areas/areas.module";
import { AREA_PROCESSING_CACHE } from "../../src/modules/areas/application/ports/area-processing-cache.port";
import { AuthModule } from "../../src/modules/auth/auth.module";
import { AUTH_REPOSITORY } from "../../src/modules/auth/application/ports/auth-repository.port";
import { AccessGuard } from "../../src/modules/auth/adapters/inbound/http/access.guard";
import { CatalogModule } from "../../src/modules/catalog/catalog.module";
import { PLACEABLE_PROCESSING_CACHE } from "../../src/modules/catalog/application/ports/placeable-processing-cache.port";
import { ProcessingGraphModule } from "../../src/modules/processing-graph/processing-graph.module";
import { ProcessingJobsModule } from "../../src/modules/processing-jobs/processing-jobs.module";
import { RuntimeSettingsModule } from "../../src/modules/runtime-settings/runtime-settings.module";
import { SoundsModule } from "../../src/modules/sounds/sounds.module";
import { SOUND_PROCESSING_CACHE } from "../../src/modules/sounds/application/ports/sound-processing-cache.port";
import { SOUND_REPOSITORY } from "../../src/modules/sounds/application/ports/sound-repository.port";
import { TilesModule } from "../../src/modules/tiles/tiles.module";
import { TILE_PROCESSING_CACHE } from "../../src/modules/tiles/application/ports/tile-processing-cache.port";

type ProviderEntry = {
  provide?: unknown;
  useClass?: unknown;
  useFactory?: (...args: any[]) => unknown;
};

describe("Module wiring", () => {
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
    const tileProvider = getFactoryProvider(TilesModule, TILE_PROCESSING_CACHE);
    const soundRepositoryProvider = getFactoryProvider(SoundsModule, SOUND_REPOSITORY);
    const soundCacheProvider = getFactoryProvider(SoundsModule, SOUND_PROCESSING_CACHE);
    const authRepositoryProvider = getFactoryProvider(AuthModule, AUTH_REPOSITORY);

    const layered = { name: "layered" };
    const memory = { name: "memory" };
    const snapshotRepo = { name: "snapshot" };
    const staticRepo = { name: "static" };
    const mysqlRepo = { name: "mysql" };

    expect(catalogProvider.useFactory?.({ isTest: true }, layered, memory)).toBe(memory);
    expect(catalogProvider.useFactory?.({ isTest: false }, layered, memory)).toBe(layered);

    expect(areaProvider.useFactory?.({ isTest: true }, layered, memory)).toBe(memory);
    expect(areaProvider.useFactory?.({ isTest: false }, layered, memory)).toBe(layered);

    expect(tileProvider.useFactory?.({ isTest: true }, layered, memory)).toBe(memory);
    expect(tileProvider.useFactory?.({ isTest: false }, layered, memory)).toBe(layered);

    expect(soundRepositoryProvider.useFactory?.({ isTest: true }, snapshotRepo, staticRepo)).toBe(
      staticRepo
    );
    expect(soundRepositoryProvider.useFactory?.({ isTest: false }, snapshotRepo, staticRepo)).toBe(
      snapshotRepo
    );

    expect(soundCacheProvider.useFactory?.({ isTest: true }, layered, memory)).toBe(memory);
    expect(soundCacheProvider.useFactory?.({ isTest: false }, layered, memory)).toBe(layered);

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
