import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupSwagger } from "../src/common/openapi/swagger";
import { setupCors } from "../src/common/http/cors";

describe("Auth API v1 (e2e)", () => {
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

  it("POST /api/v1/auth/login returns contract-shaped success payload", async () => {
    const response = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "builder.user",
        password: "builder123"
      })
      .expect(200);

    expect(response.body.contractVersion).toBe("1.0.0");
    expect(typeof response.body.requestId).toBe("string");
    expect(response.body.data.session.accessToken).toEqual(expect.any(String));
    expect(response.body.data.session.issuedAt).toEqual(expect.any(String));
    expect(response.body.data.session.expiresAt).toEqual(expect.any(String));
    expect(response.body.data.user.userId).toBe("u_builder_001");
    expect(response.body.data.user.roles).toEqual(["builder"]);
  });

  it("POST /api/v1/auth/login rejects invalid credentials", async () => {
    const response = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "builder.user",
        password: "invalid"
      })
      .expect(401);

    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("GET /api/v1/auth/me denies missing bearer token", async () => {
    const response = await supertest(httpServer)
      .get("/api/v1/auth/me")
      .expect(401);

    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/v1/auth/me denies non-bearer authorization scheme", async () => {
    const response = await supertest(httpServer)
      .get("/api/v1/auth/me")
      .set("Authorization", "Basic abc")
      .expect(401);

    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/v1/auth/me allows authenticated role", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "viewer.user",
        password: "viewer123"
      })
      .expect(200);

    const token = login.body.data.session.accessToken as string;
    const me = await supertest(httpServer)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(me.body.data.userId).toBe("u_viewer_001");
    expect(me.body.data.roles).toEqual(["viewer"]);
    expect(me.body.data.permissions).toContain("scene.read");
  });

  it("GET /api/v1/auth/me accepts bearer token with trailing spaces", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "viewer.user",
        password: "viewer123"
      })
      .expect(200);

    const token = login.body.data.session.accessToken as string;
    const me = await supertest(httpServer)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}   `)
      .expect(200);

    expect(me.body.data.userId).toBe("u_viewer_001");
  });

  it("GET /api/v1/auth/admin/ping denies non-admin role", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "builder.user",
        password: "builder123"
      })
      .expect(200);

    const token = login.body.data.session.accessToken as string;
    const denied = await supertest(httpServer)
      .get("/api/v1/auth/admin/ping")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(denied.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("GET /api/v1/auth/admin/ping allows admin role", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "admin.user",
        password: "admin123"
      })
      .expect(200);

    const token = login.body.data.session.accessToken as string;
    const allowed = await supertest(httpServer)
      .get("/api/v1/auth/admin/ping")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(allowed.body.data.status).toBe("ok");
  });

  it("POST /api/v1/auth/users denies non-admin role", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "builder.user",
        password: "builder123"
      })
      .expect(200);

    const token = login.body.data.session.accessToken as string;
    const denied = await supertest(httpServer)
      .post("/api/v1/auth/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        username: "qa.viewer.denied",
        password: "StrongPass123",
        displayName: "Denied Viewer",
        role: "viewer"
      })
      .expect(403);

    expect(denied.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("POST /api/v1/auth/users allows admin role and created user can login", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "admin.user",
        password: "admin123"
      })
      .expect(200);

    const adminToken = login.body.data.session.accessToken as string;
    const username = `qa.viewer.${Date.now()}`;

    const created = await supertest(httpServer)
      .post("/api/v1/auth/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        username,
        password: "StrongPass123",
        displayName: "QA Viewer",
        role: "viewer"
      })
      .expect(201);

    expect(created.body.data.userId).toEqual(expect.any(String));
    expect(created.body.data.username).toBe(username);
    expect(created.body.data.displayName).toBe("QA Viewer");
    expect(created.body.data.role).toBe("viewer");

    const createdLogin = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username,
        password: "StrongPass123"
      })
      .expect(200);

    expect(createdLogin.body.data.user.roles).toEqual(["viewer"]);
    expect(createdLogin.body.data.user.displayName).toBe("QA Viewer");
  });

  it("POST /api/v1/auth/users rejects duplicate username", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "admin.user",
        password: "admin123"
      })
      .expect(200);

    const adminToken = login.body.data.session.accessToken as string;
    const payload = {
      username: "qa.viewer.duplicate",
      password: "StrongPass123",
      displayName: "Duplicate Viewer",
      role: "viewer"
    };

    await supertest(httpServer)
      .post("/api/v1/auth/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    const duplicate = await supertest(httpServer)
      .post("/api/v1/auth/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload)
      .expect(409);

    expect(duplicate.body.error.code).toBe("USER_ALREADY_EXISTS");
  });

  it("POST /api/v1/auth/logout invalidates token", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "dm.user",
        password: "dm123"
      })
      .expect(200);

    const token = login.body.data.session.accessToken as string;
    await supertest(httpServer)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const meAfterLogout = await supertest(httpServer)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(meAfterLogout.body.error.code).toBe("INVALID_SESSION");
  });

  it("GET /api/v1/docs-json exposes OpenAPI document", async () => {
    const response = await supertest(httpServer)
      .get("/api/v1/docs-json")
      .expect(200);

    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.paths["/api/v1/auth/login"]).toBeDefined();
  });

  it("POST /api/v1/auth/login attaches CORS headers for allowed origin", async () => {
    const response = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:5173")
      .send({
        username: "viewer.user",
        password: "viewer123"
      })
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173"
    );
  });

  it("POST /api/v1/auth/login omits CORS headers for blocked origin", async () => {
    const response = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .set("Origin", "http://evil.example")
      .send({
        username: "viewer.user",
        password: "viewer123"
      })
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("GET /api/v1/auth/dm/action/ping blocks role without required permission", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "builder.user",
        password: "builder123"
      })
      .expect(200);

    const token = login.body.data.session.accessToken as string;
    const denied = await supertest(httpServer)
      .get("/api/v1/auth/dm/action/ping")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(denied.body.error.code).toBe("FORBIDDEN_PERMISSION");
  });

  it("GET /api/v1/auth/dm/action/ping allows role with required permission", async () => {
    const login = await supertest(httpServer)
      .post("/api/v1/auth/login")
      .send({
        username: "dm.user",
        password: "dm123"
      })
      .expect(200);

    const token = login.body.data.session.accessToken as string;
    const allowed = await supertest(httpServer)
      .get("/api/v1/auth/dm/action/ping")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(allowed.body.data.status).toBe("ok");
  });
});
