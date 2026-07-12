import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

describe("Catalog API v1 (e2e)", () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.AUTH_REPOSITORY_DRIVER = "memory";
    process.env.CONTRACT_VERSION = "1.0.0";
    process.env.SWAGGER_ENABLED = "true";
    process.env.SWAGGER_PATH = "docs";
    process.env.SWAGGER_JSON_PATH = "docs-json";
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173";

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
  });

  it("GET /api/v1/catalog/placeables denies missing bearer token", async () => {
    const response = await supertest(httpServer)
      .get("/api/v1/catalog/placeables")
      .expect(401);

    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/v1/catalog/placeables returns paginated list", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/placeables?limit=10&offset=0")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.total).toBeGreaterThan(0);
    expect(response.body.data.limit).toBe(10);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.items[0].kind).toBe("placeable");
    expect(response.body.data.items[0].placeableSubtype).toEqual(expect.any(String));
    expect(response.body.data.items[0].previewImageUrl).toEqual(expect.any(String));
  });

  it("GET /api/v1/catalog/placeables supports query filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/placeables?query=market")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{ name: string; resref: string }>) {
      const normalized = `${item.name} ${item.resref}`.toLowerCase();
      expect(normalized.includes("market")).toBe(true);
    }
  });

  it("GET /api/v1/catalog/placeables supports subtype filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/placeables?subtype=vfx")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{ placeableSubtype: string }>) {
      expect(item.placeableSubtype).toBe("vfx");
    }
  });

  it("GET /api/v1/catalog/placeables accepts vvx alias for vfx subtype", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/placeables?subtype=vvx")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{ placeableSubtype: string }>) {
      expect(item.placeableSubtype).toBe("vfx");
    }
  });

  it("GET /api/v1/catalog/placeables supports benchmark filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/placeables?benchmark=true")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{ benchmarkCandidate?: boolean }>) {
      expect(item.benchmarkCandidate).toBe(true);
    }
  });

  it("GET /api/v1/catalog/placeables/:id/preview includes placeable subtype", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/placeables/plc_city_gate_001/preview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.kind).toBe("placeable");
    expect(response.body.data.placeableSubtype).toBe("door");
    expect(response.body.data.benchmarkCandidate).toBe(false);
  });

  it("POST /api/v1/catalog/placeables/process denies viewer role", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/placeables/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ templateId: "plc_torch_smoke_vfx_001" })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("POST /api/v1/catalog/placeables/process returns normalized placeable contract", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/placeables/process")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateId: "plc_torch_smoke_vfx_001",
        subtypeHint: "vvxy",
        bypassCache: false
      })
      .expect(200);

    expect(response.body.data.placeable.placeableSubtype).toBe("vfx");
    expect(response.body.data.placeable.render.frontendType).toBe("vfx");
    expect(response.body.data.placeable.render.rendererPreset).toBe("vfx-emitter");
    expect(response.body.data.placeable.assetManifest.version).toBe(
      "placeable-asset-manifest/v1"
    );
    expect(response.body.data.cache.key).toEqual(expect.any(String));
  });

  it("GET /api/v1/catalog/placeables/cache/:cacheKey returns cached payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/placeables/process")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateId: "plc_city_gate_001",
        bypassCache: false
      })
      .expect(200);

    const cacheKey = processed.body.data.cache.key as string;
    const cached = await supertest(httpServer)
      .get(`/api/v1/catalog/placeables/cache/${cacheKey}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(cached.body.data.placeable.templateId).toBe("plc_city_gate_001");
    expect(cached.body.data.placeable.assetManifest).toEqual(expect.any(Object));
    expect(cached.body.data.cache.hit).toBe(true);
  });

  it("POST /api/v1/catalog/placeables/benchmark returns benchmark metrics", async () => {
    const token = await loginAndGetToken("dm.user", "dm123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/placeables/benchmark")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateIds: ["plc_torch_smoke_vfx_001"],
        iterations: 3,
        warmupIterations: 1,
        bypassCache: true
      })
      .expect(200);

    expect(response.body.data.datasetFingerprint).toEqual(expect.any(String));
    expect(response.body.data.metrics.perCandidate).toHaveLength(1);
    expect(response.body.data.metrics.overall.p95Ms).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/v1/catalog/creatures/:id/preview returns preview payload", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/creatures/cre_guard_human_001/preview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.templateId).toBe("cre_guard_human_001");
    expect(response.body.data.kind).toBe("creature");
    expect(response.body.data.previewImageUrl).toEqual(expect.any(String));
  });

  it("POST /api/v1/catalog/creatures/process returns processed creature payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/creatures/process")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateId: "cre_guard_human_001",
        bypassCache: false
      })
      .expect(200);

    expect(response.body.data.cache.key).toEqual(expect.any(String));
    expect(response.body.data.creature.kind).toBe("creature");
    expect(response.body.data.creature.render.frontendType).toBe("creature");
    expect(response.body.data.creature.creatureRenderPackage).toEqual(expect.any(Object));
    expect(response.body.data.creature.creatureRenderPackage.rendererPreset).toBe(
      "creature-standard"
    );
    expect(response.body.data.creature.creatureRuntime).toEqual(expect.any(Object));
    expect(Array.isArray(response.body.data.creature.creatureValidationIssues)).toBe(true);
  });

  it("GET /api/v1/catalog/creatures/cache/:cacheKey returns cached creature payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/creatures/process")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateId: "cre_guard_human_001",
        bypassCache: false
      })
      .expect(200);

    const cacheKey = processed.body.data.cache.key as string;
    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/creatures/cache/${cacheKey}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.cache.hit).toBe(true);
    expect(response.body.data.creature.templateId).toBe("cre_guard_human_001");
  });

  it("POST /api/v1/catalog/items/process returns processed item payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/items/process")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateId: "itm_health_potion_001",
        bypassCache: false
      })
      .expect(200);

    expect(response.body.data.cache.key).toEqual(expect.any(String));
    expect(response.body.data.item.kind).toBe("item");
    expect(response.body.data.item.render.frontendType).toBe("item");
  });

  it("GET /api/v1/catalog/items/cache/:cacheKey returns cached item payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/items/process")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateId: "itm_health_potion_001",
        bypassCache: false
      })
      .expect(200);

    const cacheKey = processed.body.data.cache.key as string;
    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/items/cache/${cacheKey}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.cache.hit).toBe(true);
    expect(response.body.data.item.templateId).toBe("itm_health_potion_001");
  });

  it("GET /api/v1/catalog/items/:id/preview returns 404 for unknown template", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/items/unknown_template/preview")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("TEMPLATE_NOT_FOUND");
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
