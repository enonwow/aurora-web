import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

describe("Catalog Placeables Delivery API v1 (e2e)", () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.AUTH_REPOSITORY_DRIVER = "memory";
    process.env.CONTRACT_VERSION = "1.0.0";
    process.env.SWAGGER_ENABLED = "false";
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

  it("GET /api/v1/catalog/placeables/cache/:cacheKey/assets/contracts resolves contracts route (not :assetId)", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const cacheKey = await processPlaceableAndGetCacheKey(token);

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/placeables/cache/${cacheKey}/assets/contracts`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body?.data?.cacheKey).toBe(cacheKey);
    expect(Array.isArray(response.body?.data?.assets)).toBe(true);
    expect(response.body?.error).toBeUndefined();
  });

  it("GET /api/v1/catalog/placeables/cache/:cacheKey/assets/contracts returns 422 for invalid assetIds query", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const cacheKey = await processPlaceableAndGetCacheKey(token);

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/placeables/cache/${cacheKey}/assets/contracts?assetIds=not-hex`)
      .set("Authorization", `Bearer ${token}`)
      .expect(422);

    expect(response.body?.error?.code).toBe("VALIDATION_FAILED");
    expect(response.body?.error?.message).toBe(
      "Placeable asset delivery query validation failed."
    );
  });

  async function processPlaceableAndGetCacheKey(token: string): Promise<string> {
    const response = await supertest(httpServer)
      .post("/api/v1/catalog/placeables/process")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateId: "plc_city_gate_001",
        bypassCache: false
      })
      .expect(200);

    return response.body.data.cache.key as string;
  }

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
