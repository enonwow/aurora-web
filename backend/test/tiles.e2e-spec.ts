import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

describe("Tiles API v1 (e2e)", () => {
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

  it("GET /api/v1/catalog/tiles denies missing bearer token", async () => {
    const response = await supertest(httpServer).get("/api/v1/catalog/tiles").expect(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/v1/catalog/tiles returns paginated list", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/tiles?limit=10&offset=0")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.total).toBeGreaterThan(0);
    expect(response.body.data.items[0].tileId).toEqual(expect.any(String));
  });

  it("GET /api/v1/catalog/tiles supports benchmark filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/tiles?benchmark=true")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{ benchmark: boolean }>) {
      expect(item.benchmark).toBe(true);
    }
  });

  it("GET /api/v1/catalog/tiles supports walkmesh filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/tiles?walkmesh=water")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    for (const item of response.body.data.items as Array<{ walkmesh: string }>) {
      expect(item.walkmesh).toBe("water");
    }
  });

  it("GET /api/v1/catalog/tiles rejects invalid benchmark filter", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/tiles?benchmark=yes")
      .set("Authorization", `Bearer ${token}`)
      .expect(422);

    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("GET /api/v1/catalog/tiles/:tileId returns tile payload", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/tiles/tile_city_street_001")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.tileId).toBe("tile_city_street_001");
    expect(response.body.data.textureAtlas.cacheKey).toEqual(expect.any(String));
    expect(response.body.data.textureAtlas.strategy).toBe("blob-cache");
  });

  it("GET /api/v1/catalog/tiles/:tileId/preview returns preview payload", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/tiles/tile_city_street_001/preview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.tileId).toBe("tile_city_street_001");
    expect(response.body.data.tileset).toBe("city");
    expect(response.body.data.metrics.triangles).toBeGreaterThan(0);
  });

  it("POST /api/v1/catalog/tiles/:tileId/process denies viewer role", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/tiles/tile_city_street_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("POST /api/v1/catalog/tiles/:tileId/process returns processed tile payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/tiles/tile_city_street_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);

    expect(response.body.data.cache.key).toEqual(expect.any(String));
    expect(response.body.data.tile.tileId).toBe("tile_city_street_001");
  });

  it("POST /api/v1/catalog/tiles/benchmark returns benchmark metrics", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/catalog/tiles/benchmark")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tileIds: ["tile_city_street_001"],
        iterations: 3,
        warmupIterations: 1,
        bypassCache: true
      })
      .expect(200);

    expect(response.body.data.datasetFingerprint).toEqual(expect.any(String));
    expect(response.body.data.metrics.perCandidate).toHaveLength(1);
  });

  it("GET /api/v1/catalog/tiles/cache/:cacheKey returns processed tile payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/tiles/tile_city_street_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/tiles/cache/${cacheKey}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.cache.hit).toBe(true);
    expect(response.body.data.tile.tileId).toBe("tile_city_street_001");
  });

  it("GET /api/v1/catalog/tiles/cache/:cacheKey/textures/contracts returns proxy contract", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/tiles/tile_city_street_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/tiles/cache/${cacheKey}/textures/contracts?mode=proxy`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.textureAtlas.mode).toBe("proxy");
    expect(response.body.data.textureAtlas.proxyPath).toBe(
      `/api/v1/catalog/tiles/cache/${cacheKey}/textures`
    );
  });

  it("GET /api/v1/catalog/tiles/cache/:cacheKey/textures/contracts returns direct contract", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/tiles/tile_city_street_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/tiles/cache/${cacheKey}/textures/contracts?mode=direct`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.textureAtlas.mode).toBe("direct");
    expect(response.body.data.textureAtlas.directUrl).toEqual(expect.any(String));
    expect(response.body.data.textureAtlas.s3Url).toEqual(expect.any(String));
  });

  it("GET /api/v1/catalog/tiles/cache/:cacheKey/textures returns 404 when blob lookup is unavailable in test", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/catalog/tiles/tile_city_street_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/catalog/tiles/cache/${cacheKey}/textures`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("TILE_TEXTURE_BLOB_NOT_FOUND");
  });

  it("GET /api/v1/catalog/tiles/:tileId returns 404 for unknown tile", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/catalog/tiles/unknown_tile")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("TILE_NOT_FOUND");
    expect(response.body.error.message).toBe("Tile was not found.");
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
