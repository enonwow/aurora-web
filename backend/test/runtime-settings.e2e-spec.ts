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
import { AuthApplicationService } from "../src/modules/auth/application/auth.application.service";
import { RuntimeSettingsApplicationService } from "../src/modules/runtime-settings/application/runtime-settings.application.service";
import { SystemMaintenanceApplicationService } from "../src/modules/system-maintenance/application/system-maintenance.application.service";

const POC_PATHS = {
  vanillaDataPath:
    "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data",
  hakDirectoryPath: "C:/Users/enonw/Documents/Neverwinter Nights/hak",
  moduleDecompiledPath:
    "C:/Users/enonw/Documents/Neverwinter Nights/LC-Decompiled/temp0",
  modulePackedPath: "C:/Users/enonw/Documents/Neverwinter Nights/modules/the_last_city.mod",
  tlkBasePath:
    "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/lang/en/data/dialog.tlk",
  tlkCustomPath: ""
} as const;

describe("Runtime Settings API v1 (e2e)", () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;
  const tempRoot = path.resolve(tmpdir(), "aurora-web-backend-e2e");
  const runtimeSettingsFile = path.resolve(
    tempRoot,
    "runtime-settings.e2e.json"
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

    await mkdir(path.dirname(runtimeSettingsFile), { recursive: true });
    await rm(runtimeSettingsFile, { force: true });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

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
  });

  it("GET /api/v1/settings/runtime denies non-admin role", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .get("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("GET /api/v1/settings/runtime returns settings for admin", async () => {
    const token = await loginAndGetToken("admin.user", "admin123");

    const response = await supertest(httpServer)
      .get("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.revision).toBe(1);
    expect(response.body.data.paths.moduleDecompiledPath).toEqual(expect.any(String));
    expect(response.body.data.blobStorage.bucket).toEqual(expect.any(String));
    expect(response.body.data.hakProfiles).toEqual(expect.any(Object));
    expect(response.body.data.sources.area.includeModuleTemp0).toBe(true);
    expect(response.body.data.benchmarkCandidates.placeableHeavyVfx.resref).toBe(
      "ad_top_lion_1"
    );
  });

  it("returns readiness to a non-admin without exposing configured paths", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .get("/api/v1/settings/runtime/readiness")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.ready).toEqual(expect.any(Boolean));
    expect(response.body.data.canConfigure).toBe(false);
    expect(response.body.data.values).toBeUndefined();
  });

  it("validates onboarding paths and requires explicit global-logout confirmation before save", async () => {
    const userRoot = path.join(tempRoot, "onboarding-user");
    const installRoot = path.join(tempRoot, "onboarding-install");
    const packedModulePath = path.join(userRoot, "module.mod");
    const hakRoot = path.join(userRoot, "hak");
    const generatorRoot = path.join(tempRoot, "reference", "utg");
    await Promise.all([
      mkdir(hakRoot, { recursive: true }),
      mkdir(generatorRoot, { recursive: true }),
      mkdir(path.join(installRoot, "data"), { recursive: true }),
      mkdir(path.join(installRoot, "lang", "en", "data"), { recursive: true })
    ]);
    await writeFile(path.join(installRoot, "lang", "en", "data", "dialog.tlk"), "tlk");
    await writeFile(packedModulePath, "module");
    const input = {
      nwnUserDir: userRoot,
      nwnInstallDir: installRoot,
      auroraReferenceDir: path.join(tempRoot, "reference"),
      hakDirectories: [hakRoot],
      itemGeneratorSourceDirectories: [generatorRoot],
      moduleDecompiledPath: "",
      modulePackedPath: packedModulePath
    };
    const adminToken = await loginAndGetToken("admin.user", "admin123");

    const validation = await supertest(httpServer)
      .post("/api/v1/settings/runtime/onboarding/validate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(input)
      .expect(200);
    expect(validation.body.data.ready).toBe(true);

    const save = await supertest(httpServer)
      .put("/api/v1/settings/runtime/onboarding")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(input)
      .expect(422);
    expect(save.body.error.code).toBe("CACHE_REBUILD_CONFIRMATION_REQUIRED");
  });

  it("GET /api/v1/settings/runtime/haks/resolved returns resolved hak lists", async () => {
    const token = await loginAndGetToken("admin.user", "admin123");

    const response = await supertest(httpServer)
      .get("/api/v1/settings/runtime/haks/resolved")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.placeable).toMatchObject({
      mode: "module_ifo",
      includeHaks: true,
      hakProfileId: "lc_models"
    });
    expect(response.body.data.placeable.hakPriorityList.length).toBeGreaterThan(0);
    expect(response.body.data.area.hakPaths.length).toBeGreaterThan(0);
  });

  it("PUT /api/v1/settings/runtime cannot bypass confirmed generation rebuild", async () => {
    const token = await loginAndGetToken("admin.user", "admin123");

    const payload = {
      paths: {
        ...POC_PATHS
      },
      blobStorage: {
        endpoint: "http://localhost:8333",
        region: "us-east-1",
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current",
        accessKeyId: "seaweedfs",
        secretAccessKey: "seaweedfs-secret",
        forcePathStyle: true
      },
      telemetryDebugMode: "basic",
      hakProfiles: {
        lc_core: ["lc_core.hak"],
        lc_models: ["lc_placeables.hak", "lc_creatures.hak"],
        lc_tiles: ["lc_tiles.hak"],
        lc_audio: ["lc_sounds.hak"],
        lc_vfx: ["lc_vfx.hak"],
        lc_creatures: ["lc_creatures.hak"]
      },
      sources: {
        placeable: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: true,
          includeVanilla: true,
          hakProfileId: "lc_models",
          hakPriorityList: []
        },
        tile: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: true,
          includeVanilla: true,
          hakProfileId: "lc_tiles",
          hakPriorityList: []
        },
        area: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: true,
          includeVanilla: true,
          hakProfileId: "lc_core",
          hakPriorityList: ["lc_core", "lc_overrides"]
        },
        sound: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: true,
          includeVanilla: false,
          hakProfileId: "lc_audio",
          hakPriorityList: []
        },
        vfx: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: true,
          includeVanilla: true,
          hakProfileId: "lc_vfx",
          hakPriorityList: []
        }
      },
      benchmarkCandidates: {
        placeableHeavyNoVfx: {
          resref: "c_wingsmeph",
          metrics: { triangles: 659, meshes: 16, emitters: 0 },
          context: { source: "scene.json", note: "heavy-no-vfx" }
        },
        placeableHeavyVfx: {
          resref: "ad_top_lion_1",
          metrics: { triangles: 798, meshes: 28, emitters: 1 },
          context: { source: "scene.json", note: "heavy-vfx" }
        },
        placeableVfxPlcAlternative: {
          resref: "plc_x02",
          metrics: { triangles: 112, meshes: 5, emitters: 3 },
          context: { source: "scene.json", note: "plc-vfx-alt" }
        },
        doorHeavyInstance: {
          resref: "tn_sdoor_14",
          metrics: { triangles: 250, meshes: 10, emitters: 0 },
          context: {
            source: "area-data",
            areaResref: "wnd_slms_swamp__with_placeables",
            doorIndex: 12
          }
        },
        doorHeavySingleMesh: {
          resref: "tn_gdoor_05",
          metrics: {
            triangles: 190,
            meshes: 6,
            emitters: 0,
            maxSingleMeshTriangles: 102
          },
          context: {
            source: "area-data",
            areaResref: "wnd_slms_swamp__with_placeables",
            doorIndex: 8
          }
        }
      }
    };

    const update = await supertest(httpServer)
      .put("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(422);
    expect(update.body.error.code).toBe(
      "CACHE_REBUILD_CONFIRMATION_REQUIRED"
    );
  });

  it("PUT /api/v1/settings/runtime denies non-admin role", async () => {
    const token = await loginAndGetToken("dm.user", "dm123");

    const response = await supertest(httpServer)
      .put("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${token}`)
      .send({
        telemetryDebugMode: "off"
      })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("blocks workspace and login globally, then permits admin-only failed recovery", async () => {
    const adminToken = await loginAndGetToken("admin.user", "admin123");
    const viewerToken = await loginAndGetToken("viewer.user", "viewer123");
    const maintenance = app.get(SystemMaintenanceApplicationService);
    const auth = app.get(AuthApplicationService);
    const runtimeSettings = app.get(RuntimeSettingsApplicationService);
    const currentSettings = await runtimeSettings.getRuntimeSettings();
    const lease = await maintenance.beginPreflight("admin.user", "e2e-maintenance");
    await maintenance.enterRebuilding({
      operationId: lease.record.operationId!,
      candidateRuntimeFingerprint: "e2e-candidate",
      stagingGeneration: "g-e2e",
      candidateSettings: currentSettings,
      previousSettings: currentSettings,
      participants: [{ name: "module-snapshot", status: "running" }]
    });
    await auth.revokeAllSessions();

    const publicStatus = await supertest(httpServer)
      .get("/api/v1/system/maintenance")
      .expect(200);
    expect(publicStatus.body.data).toMatchObject({
      state: "rebuilding",
      maintenance: true,
      loginAvailable: false,
      operationId: lease.record.operationId
    });

    const blockedLogin = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username: "admin.user", password: "admin123" })
      .expect(503);
    expect(blockedLogin.body.error.code).toBe("MAINTENANCE_REBUILDING");

    const blockedWorkspace = await supertest(httpServer)
      .get("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(503);
    expect(blockedWorkspace.body.error.code).toBe("MAINTENANCE_REBUILDING");

    await maintenance.fail(
      lease.record.operationId,
      "CACHE_GENERATION_INTEGRITY_FAILED",
      "Staging generation is incomplete."
    );

    const recoveryToken = await loginAndGetToken("admin.user", "admin123");
    const blockedViewerLogin = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username: "viewer.user", password: "viewer123" })
      .expect(503);
    expect(blockedViewerLogin.body.error.code).toBe(
      "MAINTENANCE_REBUILD_FAILED"
    );

    const details = await supertest(httpServer)
      .get(
        `/api/v1/settings/runtime/cache-rebuilds/${lease.record.operationId}`
      )
      .set("Authorization", `Bearer ${recoveryToken}`)
      .expect(200);
    expect(details.body.data).toMatchObject({
      state: "failed",
      error: { code: "CACHE_GENERATION_INTEGRITY_FAILED" }
    });

    await supertest(httpServer)
      .post(
        `/api/v1/settings/runtime/cache-rebuilds/${lease.record.operationId}/rollback`
      )
      .set("Authorization", `Bearer ${recoveryToken}`)
      .expect(201);

    await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username: "viewer.user", password: "viewer123" })
      .expect(200);

    await supertest(httpServer)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(401);
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
