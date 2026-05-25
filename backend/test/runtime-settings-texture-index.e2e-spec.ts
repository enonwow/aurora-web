import { mkdir, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectPayload,
  type ModuleBlobSnapshotSummary,
  type ModuleBlobSourceDeltaSummary,
  type ModuleBlobStoragePort,
  type ModuleBlobSyncResult
} from "../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { PackedModuleFile } from "../src/modules/runtime-settings/application/ports/packed-module-extractor.port";
import type { BlobStorageSettings } from "../src/modules/runtime-settings/domain/runtime-settings.types";

class InMemoryModuleBlobStorage implements ModuleBlobStoragePort {
  private readonly objects = new Map<string, Buffer>();

  async replaceModuleSnapshot(
    settings: BlobStorageSettings,
    files: PackedModuleFile[]
  ): Promise<ModuleBlobSyncResult> {
    const prefix = normalizePrefix(settings.modulePrefix);
    const sourceDelta = createEmptySourceDelta();

    let uploadedBytes = 0;
    for (const file of files) {
      const normalizedName = file.fileName.replace(/\\/gu, "/");
      const key = `${prefix}${normalizedName}`;
      const bytes = Buffer.from(file.bytes);
      this.objects.set(key, bytes);
      uploadedBytes += bytes.length;
      addSourceMetric(sourceDelta, key, bytes.length, prefix);
    }

    return {
      bucket: settings.bucket,
      prefix,
      moduleHash: "e2e-module-hash",
      status: "updated",
      uploadedFiles: files.length,
      uploadedBytes,
      deletedFiles: 0,
      deletedBytes: 0,
      unchangedFiles: 0,
      totalFiles: files.length,
      sourceDelta
    };
  }

  async listModuleSnapshot(
    settings: BlobStorageSettings,
    options?: { limit?: number; continuationToken?: string }
  ): Promise<ModuleBlobSnapshotSummary> {
    const prefix = normalizePrefix(settings.modulePrefix);
    const all = [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, bytes]) => ({ key, size: bytes.length }));
    const limit = options?.limit ?? 200;
    const objects = all.slice(0, limit).map((entry) => ({
      key: entry.key,
      size: entry.size,
      etag: undefined,
      lastModified: undefined
    }));

    return {
      bucket: settings.bucket,
      prefix,
      moduleHash: "e2e-module-hash",
      totalFiles: all.length,
      totalBytes: all.reduce((sum, entry) => sum + entry.size, 0),
      objects,
      truncated: all.length > limit,
      continuationToken: undefined
    };
  }

  async getModuleObject(
    _settings: BlobStorageSettings,
    key: string
  ): Promise<ModuleBlobObjectPayload | null> {
    const bytes = this.objects.get(key);
    if (!bytes) {
      return null;
    }

    return {
      key,
      size: bytes.length,
      contentType: "application/json",
      bytes: Buffer.from(bytes)
    };
  }
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+|\/+$/gu, "");
  return trimmed ? `${trimmed}/` : "";
}

function createEmptySourceDelta(): ModuleBlobSourceDeltaSummary {
  return {
    module: emptyMetrics(),
    hak: emptyMetrics(),
    vanilla: emptyMetrics(),
    index: emptyMetrics()
  };
}

function emptyMetrics() {
  return {
    uploadedFiles: 0,
    uploadedBytes: 0,
    deletedFiles: 0,
    deletedBytes: 0,
    unchangedFiles: 0,
    unchangedBytes: 0
  };
}

function addSourceMetric(
  sourceDelta: ModuleBlobSourceDeltaSummary,
  key: string,
  size: number,
  prefix: string
): void {
  const relative = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const source = classifySource(relative);
  sourceDelta[source].uploadedFiles += 1;
  sourceDelta[source].uploadedBytes += size;
}

function classifySource(relativeKey: string): keyof ModuleBlobSourceDeltaSummary {
  if (relativeKey.startsWith("__aurora/sources/hak/")) {
    return "hak";
  }
  if (relativeKey.startsWith("__aurora/sources/vanilla/")) {
    return "vanilla";
  }
  if (relativeKey.startsWith("__aurora/meta/")) {
    return "index";
  }
  return "module";
}

describe("Runtime Settings texture-index/rebuild alignment (e2e)", () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

  const runtimeSettingsFile = path.resolve(
    process.cwd(),
    "test/.tmp/runtime-settings-texture-index.e2e.json"
  );
  const moduleFixtureRoot = path.resolve(
    process.cwd(),
    "test/.tmp/runtime-settings-texture-index-module"
  );

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.AUTH_REPOSITORY_DRIVER = "memory";
    process.env.CONTRACT_VERSION = "1.0.0";
    process.env.SWAGGER_ENABLED = "true";
    process.env.SWAGGER_PATH = "docs";
    process.env.SWAGGER_JSON_PATH = "docs-json";
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173";
    process.env.RUNTIME_SETTINGS_FILE = runtimeSettingsFile;
    process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC = "false";

    await mkdir(path.dirname(runtimeSettingsFile), { recursive: true });
    await rm(runtimeSettingsFile, { force: true });
    await rm(moduleFixtureRoot, { recursive: true, force: true });
    await mkdir(moduleFixtureRoot, { recursive: true });
    await writeFile(path.join(moduleFixtureRoot, "example.utp"), "example-utp", "utf-8");
    await writeFile(path.join(moduleFixtureRoot, "example.dds"), Buffer.from([1, 2, 3, 4]));

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(MODULE_BLOB_STORAGE)
      .useValue(new InMemoryModuleBlobStorage())
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.setGlobalPrefix("api/v1");
    const config = app.get(AppConfigService);
    setupCors(app, config);
    setupSwagger(app, config);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await rm(runtimeSettingsFile, { force: true });
    await rm(moduleFixtureRoot, { recursive: true, force: true });
  });

  it("rebuild returns sourceDelta.index and textures summary is reachable with expected shape", async () => {
    const token = await loginAndGetToken("admin.user", "admin123");

    const currentSettings = await supertest(httpServer)
      .get("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const current = currentSettings.body.data as {
      paths: Record<string, string>;
      blobStorage: Record<string, unknown>;
      telemetryDebugMode: "off" | "basic" | "full";
      hakProfiles: Record<string, string[]>;
      sources: Record<string, Record<string, unknown>>;
      benchmarkCandidates: Record<string, unknown>;
    };

    const payload = {
      paths: {
        ...current.paths,
        moduleDecompiledPath: moduleFixtureRoot,
        modulePackedPath: "",
        hakDirectoryPath: moduleFixtureRoot,
        vanillaDataPath: moduleFixtureRoot
      },
      blobStorage: {
        ...current.blobStorage,
        modulePrefix: "modules/e2e-runtime-texture-index"
      },
      telemetryDebugMode: current.telemetryDebugMode,
      hakProfiles: current.hakProfiles,
      sources: {
        placeable: {
          ...current.sources.placeable,
          includeHaks: false,
          includeVanilla: false
        },
        tile: {
          ...current.sources.tile,
          includeHaks: false,
          includeVanilla: false
        },
        area: {
          ...current.sources.area,
          includeHaks: false,
          includeVanilla: false
        },
        sound: {
          ...current.sources.sound,
          includeHaks: false,
          includeVanilla: false
        }
      },
      benchmarkCandidates: current.benchmarkCandidates
    };

    await supertest(httpServer)
      .put("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(200);

    const rebuild = await supertest(httpServer)
      .post("/api/v1/settings/runtime/module-cache/rebuild")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(rebuild.body.data.sync).toEqual(
      expect.objectContaining({
        sourceDelta: expect.objectContaining({
          index: expect.objectContaining({
            uploadedFiles: expect.any(Number),
            uploadedBytes: expect.any(Number),
            deletedFiles: expect.any(Number),
            deletedBytes: expect.any(Number),
            unchangedFiles: expect.any(Number),
            unchangedBytes: expect.any(Number)
          })
        })
      })
    );

    const summary = await supertest(httpServer)
      .get("/api/v1/settings/runtime/module-cache/textures/summary")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(summary.body.data).toEqual(
      expect.objectContaining({
        available: true,
        indexObjectKey: expect.stringContaining(
          "modules/e2e-runtime-texture-index/__aurora/meta/texture-index.v1.json"
        ),
        version: "texture-index/v1",
        totalTextures: expect.any(Number),
        totalBytes: expect.any(Number)
      })
    );
    expect(summary.body.data.totalTextures).toBeGreaterThan(0);
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
