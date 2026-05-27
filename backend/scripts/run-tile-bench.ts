import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

async function main() {
  process.env.NODE_ENV = "test";
  process.env.AUTH_REPOSITORY_DRIVER = "memory";
  process.env.CONTRACT_VERSION = "1.0.0";
  process.env.SWAGGER_ENABLED = "false";
  process.env.SWAGGER_PATH = "docs";
  process.env.SWAGGER_JSON_PATH = "docs-json";
  process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173";

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix("api/v1");
  const config = app.get(AppConfigService);
  setupCors(app, config);
  setupSwagger(app, config);

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const server = app.getHttpServer();
  const login = await supertest(server)
    .post("/api/v1/auth/login")
    .send({ username: "dm.user", password: "dm123" })
    .expect(200);
  const token = login.body.data.session.accessToken as string;

  const tileIds = ["tile_city_street_001", "tile_city_gate_002", "tile_swamp_water_003"];

  const cold = await supertest(server)
    .post("/api/v1/catalog/tiles/benchmark")
    .set("Authorization", `Bearer ${token}`)
    .send({
      tileIds,
      iterations: 200,
      warmupIterations: 20,
      bypassCache: true
    })
    .expect(200);

  const warm = await supertest(server)
    .post("/api/v1/catalog/tiles/benchmark")
    .set("Authorization", `Bearer ${token}`)
    .send({
      tileIds,
      iterations: 200,
      warmupIterations: 20,
      bypassCache: false
    })
    .expect(200);

  const output = {
    generatedAt: new Date().toISOString(),
    tileIds,
    cold: cold.body.data,
    warm: warm.body.data
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
  await app.close();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
