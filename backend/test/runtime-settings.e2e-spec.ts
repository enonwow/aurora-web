import { mkdir, rm } from "node:fs/promises";
import * as path from "node:path";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

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
  const runtimeSettingsFile = path.resolve(
    process.cwd(),
    "test/.tmp/runtime-settings.e2e.json"
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

  it("GET /api/v1/settings/runtime/haks/resolved returns resolved hak lists", async () => {
    const token = await loginAndGetToken("admin.user", "admin123");

    const response = await supertest(httpServer)
      .get("/api/v1/settings/runtime/haks/resolved")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.placeable).toMatchObject({
      mode: "profile",
      includeHaks: true,
      hakProfileId: "lc_models"
    });
    expect(response.body.data.placeable.hakPriorityList.length).toBeGreaterThan(0);
    expect(response.body.data.area.hakPaths.length).toBeGreaterThan(0);
  });

  it("PUT /api/v1/settings/runtime lets admin overwrite settings", async () => {
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
        lc_audio: ["lc_sounds.hak"]
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
      .expect(200);

    expect(update.body.data.revision).toBe(2);
    expect(update.body.data.updatedBy).toBe("admin.user");
    expect(update.body.data.telemetryDebugMode).toBe("basic");
    expect(update.body.data.sources.area.hakPriorityList).toEqual([
      "lc_core",
      "lc_overrides"
    ]);

    const readBack = await supertest(httpServer)
      .get("/api/v1/settings/runtime")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(readBack.body.data.revision).toBe(2);
    expect(readBack.body.data.paths.modulePackedPath).toBe(
      POC_PATHS.modulePackedPath
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

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
