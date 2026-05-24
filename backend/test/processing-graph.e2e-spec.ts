import { mkdir, rm } from "node:fs/promises";
import * as path from "node:path";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

describe("Processing Graph API v1 (e2e)", () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;
  const snapshotFile = path.resolve(
    process.cwd(),
    "test/.tmp/processing-graph-snapshot.e2e.json"
  );

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.AUTH_REPOSITORY_DRIVER = "memory";
    process.env.CONTRACT_VERSION = "1.0.0";
    process.env.SWAGGER_ENABLED = "true";
    process.env.SWAGGER_PATH = "docs";
    process.env.SWAGGER_JSON_PATH = "docs-json";
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173";
    process.env.PROCESSING_GRAPH_SNAPSHOT_FILE = snapshotFile;

    await mkdir(path.dirname(snapshotFile), { recursive: true });
    await rm(snapshotFile, { force: true });

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
    await rm(snapshotFile, { force: true });
  });

  it("GET /api/v1/processing/graphs/summary denies missing token", async () => {
    const response = await supertest(httpServer)
      .get("/api/v1/processing/graphs/summary")
      .expect(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/v1/processing/graphs/summary denies viewer role", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .get("/api/v1/processing/graphs/summary")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("GET /api/v1/processing/graphs/summary returns graph summary for builder", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .get("/api/v1/processing/graphs/summary")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.datasetHash).toEqual(expect.any(String));
    expect(response.body.data.statistics.areas).toBeGreaterThan(0);
    expect(response.body.data.statistics.areaObjects).toBeGreaterThan(0);
    expect(Array.isArray(response.body.data.resourceGraph.nodes)).toBe(true);
    expect(response.body.data.indexes.templatesByArea).toEqual(expect.any(Object));
  });

  it("GET /api/v1/processing/graphs/areas/:areaId returns area subgraph for dm", async () => {
    const token = await loginAndGetToken("dm.user", "dm123");

    const response = await supertest(httpServer)
      .get("/api/v1/processing/graphs/areas/area_market_district_001")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.areaId).toBe("area_market_district_001");
    expect(response.body.data.areaNode.id).toBe("area:area_market_district_001");
    expect(Array.isArray(response.body.data.objectNodes)).toBe(true);
    expect(response.body.data.stats.objects).toBeGreaterThan(0);
  });

  it("GET /api/v1/processing/graphs/areas/:areaId returns 404 for unknown area", async () => {
    const token = await loginAndGetToken("admin.user", "admin123");

    const response = await supertest(httpServer)
      .get("/api/v1/processing/graphs/areas/unknown_area")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("AREA_NOT_FOUND");
  });

  it("GET /api/v1/processing/graphs/delta/preview returns initial delta for builder", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .get("/api/v1/processing/graphs/delta/preview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.baseline).toBe("none");
    expect(response.body.data.changed).toBe(true);
    expect(response.body.data.summary.added).toBeGreaterThan(0);
    expect(response.body.data.impacted.areas.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/processing/graphs/delta/checkpoint denies dm role", async () => {
    const token = await loginAndGetToken("dm.user", "dm123");

    const response = await supertest(httpServer)
      .post("/api/v1/processing/graphs/delta/checkpoint")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("POST /api/v1/processing/graphs/delta/checkpoint updates and then stabilizes for builder", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const first = await supertest(httpServer)
      .post("/api/v1/processing/graphs/delta/checkpoint")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(first.body.data.checkpointUpdated).toBe(true);
    expect(first.body.data.delta.baseline).toBe("none");
    expect(first.body.data.delta.changed).toBe(true);

    const second = await supertest(httpServer)
      .post("/api/v1/processing/graphs/delta/checkpoint")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(second.body.data.checkpointUpdated).toBe(false);
    expect(second.body.data.delta.baseline).toBe("latest");
    expect(second.body.data.delta.changed).toBe(false);
    expect(second.body.data.delta.summary).toEqual({
      added: 0,
      changed: 0,
      deleted: 0
    });
  });

  it("POST /api/v1/processing/graphs/delta/rebuild denies dm role", async () => {
    const token = await loginAndGetToken("dm.user", "dm123");

    const response = await supertest(httpServer)
      .post("/api/v1/processing/graphs/delta/rebuild")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("POST /api/v1/processing/graphs/delta/rebuild creates rebuild job for builder", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .post("/api/v1/processing/graphs/delta/rebuild")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.jobId).toEqual(expect.any(String));
    expect(response.body.data.status).toBe("completed");
    expect(response.body.data.delta.baseline).toBe("latest");
    expect(Array.isArray(response.body.data.actions)).toBe(true);
  });

  it("GET /api/v1/processing/graphs/delta/jobs lists latest jobs", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .get("/api/v1/processing/graphs/delta/jobs?limit=5")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0].jobId).toEqual(expect.any(String));
  });

  it("GET /api/v1/processing/graphs/delta/jobs/:jobId returns selected job", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const list = await supertest(httpServer)
      .get("/api/v1/processing/graphs/delta/jobs?limit=1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const [latestJob] = list.body.data as Array<{ jobId: string }>;

    const response = await supertest(httpServer)
      .get(`/api/v1/processing/graphs/delta/jobs/${latestJob.jobId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.jobId).toBe(latestJob.jobId);
  });

  it("GET /api/v1/processing/graphs/delta/jobs/:jobId validates job id format", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .get("/api/v1/processing/graphs/delta/jobs/not-a-uuid")
      .set("Authorization", `Bearer ${token}`)
      .expect(422);

    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("GET /api/v1/processing/graphs/delta/jobs/:jobId returns 404 for unknown job", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const unknownJobId = "2f40a0df-4aa9-4f90-aeef-05ccf91f7fb7";

    const response = await supertest(httpServer)
      .get(`/api/v1/processing/graphs/delta/jobs/${unknownJobId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("PROCESSING_JOB_NOT_FOUND");
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
