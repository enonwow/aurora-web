import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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
import { SystemMaintenanceApplicationService } from "../src/modules/system-maintenance/application/system-maintenance.application.service";

jest.setTimeout(30_000);

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
      contentType: inferContentTypeFromKey(key),
      bytes: Buffer.from(bytes)
    };
  }
}

function inferContentTypeFromKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.endsWith(".dds")) {
    return "image/vnd-ms.dds";
  }
  if (normalized.endsWith(".tga")) {
    return "image/x-tga";
  }
  if (normalized.endsWith(".json")) {
    return "application/json";
  }
  return "application/octet-stream";
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
  const tempRoot = path.resolve(tmpdir(), "aurora-web-backend-e2e");
  const runtimeSettingsFile = path.resolve(
    tempRoot,
    "runtime-settings-texture-index.e2e.json"
  );
  const moduleFixtureRoot = path.resolve(
    tempRoot,
    "runtime-settings-texture-index-module"
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
    await Promise.all([
      mkdir(path.join(moduleFixtureRoot, "data"), { recursive: true }),
      mkdir(path.join(moduleFixtureRoot, "lang", "en", "data"), {
        recursive: true
      })
    ]);
    await writeFile(path.join(moduleFixtureRoot, "example.utp"), "example-utp", "utf-8");
    await writeFile(path.join(moduleFixtureRoot, "example.dds"), Buffer.from([1, 2, 3, 4]));
    await writeFile(
      path.join(moduleFixtureRoot, "lang", "en", "data", "dialog.tlk"),
      "fixture-tlk",
      "utf-8"
    );

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

  it("publishes a rebuilt texture index and exposes its summary", async () => {
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
      paths: createFixtureRuntimePaths(),
      blobStorage: {
        ...current.blobStorage,
        modulePrefix: "modules/e2e-runtime-texture-index"
      },
      telemetryDebugMode: current.telemetryDebugMode,
      hakProfiles: current.hakProfiles,
      sources: disableExternalSources(current.sources),
      benchmarkCandidates: current.benchmarkCandidates,
      confirmGlobalLogout: true
    };

    const update = await supertest(httpServer)
      .put("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(202);

    expect(update.body.data).toEqual(
      expect.objectContaining({
        outcome: "ACCEPTED",
        operationId: expect.any(String),
        generation: expect.stringMatching(/^g-/u)
      })
    );
    await waitForCacheRebuildCompletion(update.body.data.operationId as string);
    const refreshedToken = await loginAndGetToken("admin.user", "admin123");

    const summary = await supertest(httpServer)
      .get("/api/v1/settings/runtime/module-cache/textures/summary")
      .set("Authorization", `Bearer ${refreshedToken}`)
      .expect(200);

    expect(summary.body.data).toEqual(
      expect.objectContaining({
        available: true,
        indexObjectKey:
          `modules/e2e-runtime-texture-index/__generations/${update.body.data.generation as string}` +
          "/__aurora/meta/texture-index.v1.json",
        version: "texture-index/v1",
        totalTextures: expect.any(Number),
        totalBytes: expect.any(Number)
      })
    );
    expect(summary.body.data.totalTextures).toBeGreaterThan(0);
  });

  it("exposes texture delivery contracts and blob download for scene.read role", async () => {
    const adminToken = await loginAndGetToken("admin.user", "admin123");
    const currentSettings = await supertest(httpServer)
      .get("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const current = currentSettings.body.data as {
      paths: Record<string, string>;
      blobStorage: Record<string, unknown>;
      telemetryDebugMode: "off" | "basic" | "full";
      hakProfiles: Record<string, string[]>;
      sources: Record<string, Record<string, unknown>>;
      benchmarkCandidates: Record<string, unknown>;
    };

    const update = await supertest(httpServer)
      .put("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        paths: createFixtureRuntimePaths(),
        blobStorage: {
          ...current.blobStorage,
          modulePrefix: "modules/e2e-runtime-texture-delivery"
        },
        telemetryDebugMode: current.telemetryDebugMode,
        hakProfiles: current.hakProfiles,
        sources: disableExternalSources(current.sources),
        benchmarkCandidates: current.benchmarkCandidates,
        confirmGlobalLogout: true
      })
      .expect(202);

    await waitForCacheRebuildCompletion(update.body.data.operationId as string);
    const builderToken = await loginAndGetToken("builder.user", "builder123");

    const contracts = await supertest(httpServer)
      .get("/api/v1/settings/runtime/module-cache/textures/contracts?limit=1&offset=0")
      .set("Authorization", `Bearer ${builderToken}`)
      .expect(200);

    expect(contracts.body.data.available).toBe(true);
    expect(contracts.body.data.assets.length).toBeGreaterThan(0);
    const asset = contracts.body.data.assets[0] as {
      textureId: string;
      deliveryPath: string;
      objectKey: string;
    };
    expect(asset.textureId).toMatch(/^[a-f0-9]{24}$/u);
    expect(asset.deliveryPath).toContain("/api/v1/settings/runtime/module-cache/textures/");

    const blob = await supertest(httpServer)
      .get(asset.deliveryPath)
      .set("Authorization", `Bearer ${builderToken}`)
      .expect(200);

    expect(blob.headers["x-aurora-texture-id"]).toBe(asset.textureId);
    expect(blob.headers["x-aurora-texture-object-key"]).toBe(asset.objectKey);
    expect(Number(blob.headers["content-length"])).toBeGreaterThan(0);
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }

  async function waitForCacheRebuildCompletion(operationId: string): Promise<void> {
    const maintenance = app.get(SystemMaintenanceApplicationService);
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const state = await maintenance.getState();
      if (state.operationId === operationId && state.state === "idle") {
        return;
      }
      if (state.operationId === operationId && state.state === "failed") {
        throw new Error(
          `Runtime cache rebuild failed: ${state.errorCode ?? "UNKNOWN"}: ${state.errorMessage ?? state.phase}`
        );
      }
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 20));
    }
    throw new Error(`Runtime cache rebuild did not complete: ${operationId}`);
  }

  function createFixtureRuntimePaths() {
    return {
      nwnUserDir: moduleFixtureRoot,
      nwnInstallDir: moduleFixtureRoot,
      auroraReferenceDir: moduleFixtureRoot,
      hakDirectories: [moduleFixtureRoot],
      itemGeneratorSourceDirectories: [moduleFixtureRoot],
      vanillaDataPath: path.join(moduleFixtureRoot, "data"),
      hakDirectoryPath: moduleFixtureRoot,
      moduleDecompiledPath: moduleFixtureRoot,
      modulePackedPath: "",
      tlkBasePath: path.join(
        moduleFixtureRoot,
        "lang",
        "en",
        "data",
        "dialog.tlk"
      ),
      tlkCustomPath: ""
    };
  }

  function disableExternalSources(
    sources: Record<string, Record<string, unknown>>
  ): Record<string, Record<string, unknown>> {
    return Object.fromEntries(
      Object.entries(sources).map(([kind, source]) => [
        kind,
        {
          ...source,
          includeHaks: false,
          includeVanilla: false
        }
      ])
    );
  }
});


