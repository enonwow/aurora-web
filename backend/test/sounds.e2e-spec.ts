import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

describe("Sounds API v1 (e2e)", () => {
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

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
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

  it("GET /api/v1/catalog/sounds denies missing bearer token", async () => {
    const response = await supertest(httpServer).get("/api/v1/catalog/sounds").expect(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/v1/catalog/sounds returns paginated list", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/sounds?limit=10&offset=0")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.total).toBeGreaterThan(0);
    expect(response.body.data.items[0].soundId).toEqual(expect.any(String));
    expect(response.body.data.items[0].format).toEqual(expect.any(String));
    expect(response.body.data.items[0].auroraUsage.bindingKey).toEqual(expect.any(String));
  });

  it("GET /api/v1/catalog/sounds supports benchmark filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/sounds?benchmark=true")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{ benchmark: boolean }>) {
      expect(item.benchmark).toBe(true);
    }
  });

  it("GET /api/v1/catalog/sounds supports aurora usage filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get(
        "/api/v1/catalog/sounds?bindingKey=GI_sound_area&sourceField=AmbientSoundDay&format=ogg&spatialMode=2d"
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{
      auroraUsage: { bindingKey: string; sourceField: string };
      format: string;
      spatialMode: string;
    }>) {
      expect(item.auroraUsage.bindingKey).toBe("GI_sound_area");
      expect(item.auroraUsage.sourceField).toBe("AmbientSoundDay");
      expect(item.format).toBe("ogg");
      expect(item.spatialMode).toBe("2d");
    }
  });

  it("GET /api/v1/catalog/sounds rejects invalid benchmark filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/sounds?benchmark=yes")
      .set("Authorization", `Bearer ${token}`)
      .expect(422);

    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("GET /api/v1/catalog/sounds/:soundId returns sound payload", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/sounds/sound_ambient_city_market_001")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.soundId).toBe("sound_ambient_city_market_001");
    expect(response.body.data.audio.cacheKey).toEqual(expect.any(String));
    expect(response.body.data.audio.strategy).toBe("blob-cache");
  });

  it("GET /api/v1/catalog/sounds/:soundId/preview returns preview payload", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/sounds/sound_ambient_city_market_001/preview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.soundId).toBe("sound_ambient_city_market_001");
    expect(response.body.data.category).toBe("ambient");
    expect(response.body.data.metrics.durationMs).toBeGreaterThan(0);
  });

  it("POST /api/v1/catalog/sounds/:soundId/process denies viewer role", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/sounds/sound_ambient_city_market_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("POST /api/v1/catalog/sounds/:soundId/process returns processed sound payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/sounds/sound_ambient_city_market_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);

    expect(response.body.data.cache.key).toEqual(expect.any(String));
    expect(response.body.data.sound.soundId).toBe("sound_ambient_city_market_001");
  });

  it("POST /api/v1/catalog/sounds/benchmark returns benchmark metrics", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/sounds/benchmark")
      .set("Authorization", `Bearer ${token}`)
      .send({
        soundIds: ["sound_ambient_city_market_001"],
        iterations: 3,
        warmupIterations: 1,
        bypassCache: true
      })
      .expect(200);

    expect(response.body.data.datasetFingerprint).toEqual(expect.any(String));
    expect(response.body.data.metrics.perCandidate).toHaveLength(1);
  });

  it("GET /api/v1/catalog/sounds/cache/:cacheKey returns processed sound payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/sounds/sound_ambient_city_market_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/sounds/cache/${cacheKey}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.cache.hit).toBe(true);
    expect(response.body.data.sound.soundId).toBe("sound_ambient_city_market_001");
  });

  it("GET /api/v1/catalog/sounds/cache/:cacheKey/audio/contracts returns proxy contract", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/sounds/sound_ambient_city_market_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/sounds/cache/${cacheKey}/audio/contracts?mode=proxy`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.audio.mode).toBe("proxy");
    expect(response.body.data.audio.proxyPath).toBe(
      `/api/v1/catalog/sounds/cache/${cacheKey}/audio`
    );
  });

  it("GET /api/v1/catalog/sounds/cache/:cacheKey/audio/contracts returns direct contract", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/sounds/sound_ambient_city_market_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/sounds/cache/${cacheKey}/audio/contracts?mode=direct`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.audio.mode).toBe("direct");
    expect(response.body.data.audio.directUrl).toEqual(expect.any(String));
    expect(response.body.data.audio.s3Url).toEqual(expect.any(String));
  });

  it("GET /api/v1/catalog/sounds/cache/:cacheKey/audio returns 404 when blob lookup is unavailable in test", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/sounds/sound_ambient_city_market_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/sounds/cache/${cacheKey}/audio`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("SOUND_AUDIO_BLOB_NOT_FOUND");
  });

  it("GET /api/v1/catalog/sounds/:soundId returns 404 for unknown sound", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/sounds/unknown_sound")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("SOUND_NOT_FOUND");
    expect(response.body.error.message).toBe("Sound was not found.");
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
