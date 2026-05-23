import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

describe("Areas API v1 (e2e)", () => {
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

  it("GET /api/v1/areas denies missing bearer token", async () => {
    const response = await supertest(httpServer).get("/api/v1/areas").expect(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/v1/areas returns paginated list", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/areas?limit=10&offset=0")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.total).toBeGreaterThan(0);
    expect(response.body.data.items[0].areaId).toEqual(expect.any(String));
    expect(response.body.data.items[0].objectCounts.total).toBeGreaterThan(0);
  });

  it("GET /api/v1/areas supports benchmark filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/areas?benchmark=true")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{ benchmark: boolean }>) {
      expect(item.benchmark).toBe(true);
    }
  });

  it("GET /api/v1/areas rejects invalid benchmark filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/areas?benchmark=yes")
      .set("Authorization", `Bearer ${token}`)
      .expect(422);

    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("GET /api/v1/areas/:areaId returns area composition payload", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/areas/area_market_district_001")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.areaId).toBe("area_market_district_001");
    expect(response.body.data.textureAtlas.cacheKey).toEqual(expect.any(String));
    expect(response.body.data.textureAtlas.strategy).toBe("blob-cache");
    expect(response.body.data.composition.total).toBeGreaterThan(0);
    expect(Array.isArray(response.body.data.objects)).toBe(true);
  });

  it("GET /api/v1/areas/:areaId/preview returns preview payload", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/areas/area_market_district_001/preview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.areaId).toBe("area_market_district_001");
    expect(response.body.data.dimensions.width).toBeGreaterThan(0);
    expect(response.body.data.objectCounts.placeables).toBeGreaterThan(0);
    expect(response.body.data.objectCounts.items).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/v1/areas/:areaId returns 404 for unknown area", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/areas/unknown_area")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("AREA_NOT_FOUND");
    expect(response.body.error.message).toBe("Area was not found.");
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
