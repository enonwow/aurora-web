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
