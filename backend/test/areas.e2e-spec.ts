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
    expect(response.body.data.textureAtlas.objectKey).toEqual(expect.any(String));
    expect(response.body.data.soundscape.bindingKeys.areaKey).toBe("GI_sound_area");
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
    expect(response.body.data.soundscape.bindingKeys.randomKey).toBe("GI_sound_rndm");
    expect(response.body.data.objectCounts.placeables).toBeGreaterThan(0);
    expect(response.body.data.objectCounts.items).toBeGreaterThanOrEqual(0);
  });

  it("POST /api/v1/areas/:areaId/process denies viewer role", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .post("/api/v1/areas/area_market_district_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("POST /api/v1/areas/:areaId/process returns processed area payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/areas/area_market_district_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);

    expect(response.body.data.cache.key).toEqual(expect.any(String));
    expect(response.body.data.area.areaId).toBe("area_market_district_001");
  });

  it("GET /api/v1/areas/cache/:cacheKey returns processed area payload", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/areas/area_market_district_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/areas/cache/${cacheKey}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.cache.hit).toBe(true);
    expect(response.body.data.area.areaId).toBe("area_market_district_001");
  });

  it("GET /api/v1/areas/cache/:cacheKey/textures/contracts returns proxy contract", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/areas/area_market_district_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/areas/cache/${cacheKey}/textures/contracts?mode=proxy`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.textureAtlas.mode).toBe("proxy");
    expect(response.body.data.textureAtlas.proxyPath).toBe(
      `/api/v1/areas/cache/${cacheKey}/textures`
    );
  });

  it("GET /api/v1/areas/cache/:cacheKey/textures/contracts returns direct contract", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/areas/area_market_district_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/areas/cache/${cacheKey}/textures/contracts?mode=direct`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.textureAtlas.mode).toBe("direct");
    expect(response.body.data.textureAtlas.directUrl).toEqual(expect.any(String));
    expect(response.body.data.textureAtlas.s3Url).toEqual(expect.any(String));
  });

  it("GET /api/v1/areas/cache/:cacheKey/textures returns 404 when blob lookup is unavailable in test", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const processed = await supertest(httpServer)
      .post("/api/v1/areas/area_market_district_001/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache: false })
      .expect(200);
    const cacheKey = processed.body.data.cache.key as string;

    const response = await supertest(httpServer)
      .get(`/api/v1/areas/cache/${cacheKey}/textures`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("AREA_TEXTURE_BLOB_NOT_FOUND");
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

  it("guards Area Update validation with the narrow privileged permission", async () => {
    const path =
      "/api/v1/modules/workspace-module/areas/crypt01/update-validations";

    await supertest(httpServer).post(path).send({}).expect(401);

    const builderToken = await loginAndGetToken("builder.user", "builder123");
    const builderDenied = await supertest(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${builderToken}`)
      .send({})
      .expect(403);
    expect(builderDenied.body.error.code).toBe("FORBIDDEN_ROLE");

    const adminToken = await loginAndGetToken("admin.user", "admin123");
    const admittedToBoundary = await supertest(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(422);
    expect(admittedToBoundary.body.error.code).toBe("AREA_UPDATE_INVALID");
  });

  it("guards Area Update materialization with admin role and the narrow privileged permission", async () => {
    const path = "/api/v1/modules/workspace-module/areas/crypt01";

    await supertest(httpServer).put(path).send({}).expect(401);

    const builderToken = await loginAndGetToken("builder.user", "builder123");
    const builderDenied = await supertest(httpServer)
      .put(path)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("Idempotency-Key", "update-e2e-builder")
      .set("If-Match", `"${"1".repeat(64)}"`)
      .send({})
      .expect(403);
    expect(builderDenied.body.error.code).toBe("FORBIDDEN_ROLE");

    const adminToken = await loginAndGetToken("admin.user", "admin123");
    const admittedToBoundary = await supertest(httpServer)
      .put(path)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Idempotency-Key", "update-e2e-admin")
      .set("If-Match", `"${"1".repeat(64)}"`)
      .send({})
      .expect(422);
    expect(admittedToBoundary.body.error.code).toBe("AREA_UPDATE_INVALID");
  });

  it("guards Area Delete preview with admin role and the narrow privileged permission", async () => {
    const path =
      "/api/v1/modules/workspace-module/areas/crypt01/delete-previews";

    await supertest(httpServer).post(path).send({}).expect(401);

    const builderToken = await loginAndGetToken("builder.user", "builder123");
    const builderDenied = await supertest(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("If-Match", `"${"1".repeat(64)}"`)
      .send({})
      .expect(403);
    expect(builderDenied.body.error.code).toBe("FORBIDDEN_ROLE");

    const adminToken = await loginAndGetToken("admin.user", "admin123");
    const admittedToBoundary = await supertest(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("If-Match", `"${"1".repeat(64)}"`)
      .send({})
      .expect(422);
    expect(admittedToBoundary.body.error.code).toBe("AREA_DELETE_INVALID");
  });

  it("guards Area Delete materialization with admin role and the narrow privileged permission", async () => {
    const path = "/api/v1/modules/workspace-module/areas/crypt01";

    await supertest(httpServer).delete(path).send({}).expect(401);

    const builderToken = await loginAndGetToken("builder.user", "builder123");
    const builderDenied = await supertest(httpServer)
      .delete(path)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("Idempotency-Key", "delete-e2e-builder")
      .set("If-Match", `"${"1".repeat(64)}"`)
      .send({})
      .expect(403);
    expect(builderDenied.body.error.code).toBe("FORBIDDEN_ROLE");

    const adminToken = await loginAndGetToken("admin.user", "admin123");
    const admittedToBoundary = await supertest(httpServer)
      .delete(path)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Idempotency-Key", "delete-e2e-admin")
      .set("If-Match", `"${"1".repeat(64)}"`)
      .send({})
      .expect(422);
    expect(admittedToBoundary.body.error.code).toBe("AREA_DELETE_INVALID");
  });

  it("copies a production Area into one owner draft before editing", async () => {
    const viewerToken = await loginAndGetToken("viewer.user", "viewer123");
    const builderToken = await loginAndGetToken("builder.user", "builder123");
    const path =
      "/api/v1/areas/production/area_market_district_001/open-as-draft";
    const body = {
      schemaVersion: "area-draft-open.v1",
      draftTitle: "Market District - E2E Working Copy"
    };

    await supertest(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Idempotency-Key", "draft-open-e2e-viewer")
      .send(body)
      .expect(403);

    const created = await supertest(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("Idempotency-Key", "draft-open-e2e-0001")
      .send(body)
      .expect(201);
    expect(created.headers.etag).toBe('"1"');
    expect(created.headers["cache-control"]).toBe("no-store");
    expect(created.body.data).toMatchObject({
      idempotency: "created",
      snapshot: {
        draftId: expect.stringMatching(/^draft_[a-f0-9]{32}$/u),
        revision: 1,
        source: {
          type: "production_area",
          areaId: "area_market_district_001"
        },
        draft: {
          schemaVersion: "area-draft.v1",
          title: body.draftTitle,
          payload: {
            schemaVersion: "production-area-draft-payload.v1",
            sourceArea: {
              areaId: "area_market_district_001",
              objects: expect.any(Array),
              tiles: expect.any(Array)
            },
            provenance: {
              areaId: "area_market_district_001",
              sourceUpdatedAt: expect.any(String),
              processingCacheKey: expect.any(String)
            }
          }
        }
      }
    });

    const replayed = await supertest(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("Idempotency-Key", "draft-open-e2e-0001")
      .send(body)
      .expect(201);
    expect(replayed.body.data).toMatchObject({
      idempotency: "replayed",
      snapshot: {
        draftId: created.body.data.snapshot.draftId,
        revision: 1
      }
    });

    const conflicted = await supertest(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("Idempotency-Key", "draft-open-e2e-0001")
      .send({ ...body, draftTitle: "Different working copy" })
      .expect(409);
    expect(conflicted.body.error.code).toBe("AREA_DRAFT_IDEMPOTENCY_CONFLICT");

    await supertest(httpServer)
      .delete(`/api/v1/area-drafts/${created.body.data.snapshot.draftId}`)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("If-Match", '"1"')
      .set("Idempotency-Key", "draft-open-e2e-delete")
      .expect(200);
  });

  it("enforces owner-scoped Area draft CRUD, CAS, and idempotent replay over HTTP", async () => {
    const viewerToken = await loginAndGetToken("viewer.user", "viewer123");
    const builderToken = await loginAndGetToken("builder.user", "builder123");
    const dmToken = await loginAndGetToken("dm.user", "dm123");
    const draftId = "area_draft_e2e_01";
    const initialDocument = {
      schemaVersion: "area-draft.v1",
      title: "E2E Area draft",
      source: { type: "new" },
      payload: { sceneId: draftId, tiles: [], objects: [] }
    };

    const denied = await supertest(httpServer)
      .put(`/api/v1/area-drafts/${draftId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("If-Match", '"0"')
      .set("Idempotency-Key", "draft-e2e-viewer-denied")
      .send(initialDocument)
      .expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN_ROLE");

    const created = await supertest(httpServer)
      .put(`/api/v1/area-drafts/${draftId}`)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("If-Match", '"0"')
      .set("Idempotency-Key", "draft-e2e-save-0001")
      .send(initialDocument)
      .expect(200);
    expect(created.headers.etag).toBe('"1"');
    expect(created.headers["cache-control"]).toBe("no-store");
    expect(created.body.data).toMatchObject({
      idempotency: "created",
      snapshot: { draftId, revision: 1, draft: initialDocument }
    });

    const replayedCreate = await supertest(httpServer)
      .put(`/api/v1/area-drafts/${draftId}`)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("If-Match", '"0"')
      .set("Idempotency-Key", "draft-e2e-save-0001")
      .send(initialDocument)
      .expect(200);
    expect(replayedCreate.body.data.idempotency).toBe("replayed");
    expect(replayedCreate.body.data.snapshot.revision).toBe(1);

    const listed = await supertest(httpServer)
      .get("/api/v1/area-drafts?pageSize=25")
      .set("Authorization", `Bearer ${builderToken}`)
      .expect(200);
    expect(listed.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ draftId, revision: 1 })])
    );

    const hiddenFromOtherOwner = await supertest(httpServer)
      .get(`/api/v1/area-drafts/${draftId}?revision=1`)
      .set("Authorization", `Bearer ${dmToken}`)
      .expect(404);
    expect(hiddenFromOtherOwner.body.error.code).toBe("AREA_DRAFT_NOT_FOUND");

    const opened = await supertest(httpServer)
      .get(`/api/v1/area-drafts/${draftId}?revision=1`)
      .set("Authorization", `Bearer ${builderToken}`)
      .expect(200);
    expect(opened.headers.etag).toBe('"1"');
    expect(opened.body.data.draft).toEqual(initialDocument);

    const updatedDocument = {
      ...initialDocument,
      title: "E2E Area draft updated",
      payload: { ...initialDocument.payload, tiles: [{ row: 0, col: 0, tileId: 12 }] }
    };
    const updated = await supertest(httpServer)
      .put(`/api/v1/area-drafts/${draftId}`)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("If-Match", '"1"')
      .set("Idempotency-Key", "draft-e2e-save-0002")
      .send(updatedDocument)
      .expect(200);
    expect(updated.headers.etag).toBe('"2"');
    expect(updated.body.data.snapshot).toMatchObject({ revision: 2, draft: updatedDocument });

    const staleDelete = await supertest(httpServer)
      .delete(`/api/v1/area-drafts/${draftId}`)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("If-Match", '"1"')
      .set("Idempotency-Key", "draft-e2e-delete-stale")
      .expect(412);
    expect(staleDelete.body.error).toMatchObject({
      code: "AREA_DRAFT_REVISION_CONFLICT",
      details: [{ path: "revision", reason: "expected=1;actual=2" }]
    });

    const deleted = await supertest(httpServer)
      .delete(`/api/v1/area-drafts/${draftId}`)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("If-Match", '"2"')
      .set("Idempotency-Key", "draft-e2e-delete-0002")
      .expect(200);
    expect(deleted.body.data).toEqual({
      idempotency: "created",
      result: { draftId, deletedRevision: 2, deleted: true }
    });

    const replayedDelete = await supertest(httpServer)
      .delete(`/api/v1/area-drafts/${draftId}`)
      .set("Authorization", `Bearer ${builderToken}`)
      .set("If-Match", '"2"')
      .set("Idempotency-Key", "draft-e2e-delete-0002")
      .expect(200);
    expect(replayedDelete.body.data.idempotency).toBe("replayed");

    await supertest(httpServer)
      .get(`/api/v1/area-drafts/${draftId}?revision=2`)
      .set("Authorization", `Bearer ${builderToken}`)
      .expect(404);
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
