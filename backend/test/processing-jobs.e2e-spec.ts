import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

describe("Processing Jobs API v1 (e2e)", () => {
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
    process.env.PROCESSING_JOBS_INLINE_ENABLED = "false";
    process.env.PROCESSING_JOBS_MAX_ATTEMPTS = "2";
    process.env.PROCESSING_JOBS_RETRY_BASE_DELAY_MS = "1";
    process.env.PROCESSING_JOBS_RETRY_MAX_DELAY_MS = "5";

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

  it("POST /api/v1/processing/jobs denies missing bearer token", async () => {
    const response = await supertest(httpServer)
      .post("/api/v1/processing/jobs")
      .send({
        task: "process_placeable",
        targetId: "plc_market_stall_001"
      })
      .expect(401);

    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/v1/processing/jobs denies viewer role", async () => {
    const token = await loginAndGetToken("viewer.user", "viewer123");

    const response = await supertest(httpServer)
      .post("/api/v1/processing/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        task: "process_placeable",
        targetId: "plc_market_stall_001"
      })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("handles create -> list -> get -> result -> cancel -> retry flow", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");
    const idempotencyKey = "jobs-e2e-flow-001";

    const createResponse = await supertest(httpServer)
      .post("/api/v1/processing/jobs")
      .set("Authorization", `Bearer ${token}`)
      .set("x-idempotency-key", idempotencyKey)
      .send({
        task: "process_placeable",
        targetId: "plc_market_stall_001",
        options: {
          bypassCache: false,
          includeBenchmarkMetadata: true,
          subtypeHint: "generic"
        }
      })
      .expect(202);

    expect(createResponse.body.contractVersion).toBe("1.0.0");
    expect(createResponse.body.data.jobId).toEqual(expect.any(String));
    expect(createResponse.body.data.status).toBe("queued");
    expect(createResponse.body.data.idempotencyKey).toBe(idempotencyKey);
    expect(createResponse.body.data.task).toBe("process_placeable");
    expect(createResponse.body.data.targetId).toBe("plc_market_stall_001");

    const jobId = createResponse.body.data.jobId as string;

    const listResponse = await supertest(httpServer)
      .get("/api/v1/processing/jobs?limit=20")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.data.some((item: { jobId: string }) => item.jobId === jobId)).toBe(
      true
    );

    const getResponse = await supertest(httpServer)
      .get(`/api/v1/processing/jobs/${jobId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.data.jobId).toBe(jobId);
    expect(getResponse.body.data.status).toBe("queued");
    expect(getResponse.body.data.cancelRequested).toBe(false);

    const missingJobId = "4f35f98e-fd7d-4af8-9d68-6e3f8ce58ff4";
    const statusBatchResponse = await supertest(httpServer)
      .post("/api/v1/processing/jobs/status")
      .set("Authorization", `Bearer ${token}`)
      .send({
        jobIds: [jobId, missingJobId, jobId]
      })
      .expect(200);

    expect(statusBatchResponse.body.data.jobs).toHaveLength(1);
    expect(statusBatchResponse.body.data.jobs[0].jobId).toBe(jobId);
    expect(statusBatchResponse.body.data.jobs[0].status).toBe("queued");
    expect(statusBatchResponse.body.data.missingJobIds).toEqual([missingJobId]);

    const resultNotReady = await supertest(httpServer)
      .get(`/api/v1/processing/jobs/${jobId}/result`)
      .set("Authorization", `Bearer ${token}`)
      .expect(409);

    expect(resultNotReady.body.error.code).toBe("PROCESSING_JOB_NOT_READY");

    const cancelResponse = await supertest(httpServer)
      .post(`/api/v1/processing/jobs/${jobId}/cancel`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "cancel for retry test" })
      .expect(202);

    expect(cancelResponse.body.data.jobId).toBe(jobId);
    expect(cancelResponse.body.data.status).toBe("cancelled");
    expect(cancelResponse.body.data.cancelledReason).toBe("cancel for retry test");

    const retryResponse = await supertest(httpServer)
      .post(`/api/v1/processing/jobs/${jobId}/retry`)
      .set("Authorization", `Bearer ${token}`)
      .expect(202);

    expect(retryResponse.body.data.jobId).toBe(jobId);
    expect(retryResponse.body.data.status).toBe("queued");
    expect(retryResponse.body.data.cancelRequested).toBe(false);

    const duplicateByIdempotency = await supertest(httpServer)
      .post("/api/v1/processing/jobs")
      .set("Authorization", `Bearer ${token}`)
      .set("x-idempotency-key", idempotencyKey)
      .send({
        task: "process_placeable",
        targetId: "plc_market_stall_001"
      })
      .expect(202);

    expect(duplicateByIdempotency.body.data.jobId).toBe(jobId);
  });

  it("GET /api/v1/processing/jobs/metrics returns queue counters and p50/p95", async () => {
    const token = await loginAndGetToken("builder.user", "builder123");

    const response = await supertest(httpServer)
      .get("/api/v1/processing/jobs/metrics?windowSize=200")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.windowSize).toBe(200);
    expect(typeof response.body.data.sampledJobs).toBe("number");
    expect(response.body.data.counts).toEqual(
      expect.objectContaining({
        pending: expect.any(Number),
        running: expect.any(Number),
        failed: expect.any(Number),
        deadLetter: expect.any(Number)
      })
    );
    expect(response.body.data.durationMs).toHaveProperty("p50");
    expect(response.body.data.durationMs).toHaveProperty("p95");
  });

  async function loginAndGetToken(username: string, password: string): Promise<string> {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({ username, password })
      .expect(200);

    return login.body.data.session.accessToken as string;
  }
});
