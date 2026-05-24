import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

type BenchType = "placeable" | "creature" | "item" | "area";

interface BenchCandidate {
  type: BenchType;
  id: string;
}

interface DurationSummary {
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

interface BenchConfig {
  maxCandidatesPerType: number;
  processBypassIterations: number;
  processHitIterations: number;
  cacheReadIterations: number;
}

interface CandidateBenchResult {
  type: BenchType;
  id: string;
  cacheKey: string;
  processBypass: DurationSummary;
  processHit: DurationSummary;
  cacheRead: DurationSummary;
}

type HttpClient = supertest.SuperTest<supertest.Test>;

async function main() {
  const config = parseArgs(process.argv.slice(2));
  applyEnv();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter()
  );
  app.setGlobalPrefix("api/v1");
  const appConfig = app.get(AppConfigService);
  setupCors(app, appConfig);
  setupSwagger(app, appConfig);

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const server = app.getHttpServer();
  const client = supertest.agent(server);

  try {
    const token = await loginAndGetToken(client, "builder.user", "builder123");
    const candidates = await fetchCandidates(client, token, config.maxCandidatesPerType);
    const startedAt = new Date().toISOString();
    const results: CandidateBenchResult[] = [];

    for (const candidate of candidates) {
      const cacheKey = await primeCache(client, token, candidate);

      const processBypassDurations = await runIterations(
        config.processBypassIterations,
        async () => {
          await processCandidate(client, token, candidate, true);
        }
      );
      const processHitDurations = await runIterations(config.processHitIterations, async () => {
        await processCandidate(client, token, candidate, false);
      });
      const cacheReadDurations = await runIterations(config.cacheReadIterations, async () => {
        await getCachedCandidate(client, token, candidate, cacheKey);
      });

      results.push({
        type: candidate.type,
        id: candidate.id,
        cacheKey,
        processBypass: summarizeDurations(processBypassDurations),
        processHit: summarizeDurations(processHitDurations),
        cacheRead: summarizeDurations(cacheReadDurations)
      });
    }

    const finishedAt = new Date().toISOString();
    const grouped = groupByType(results);
    const output = {
      generatedAt: finishedAt,
      timing: {
        startedAt,
        finishedAt
      },
      config,
      totals: {
        candidates: results.length,
        requests:
          results.length *
          (1 +
            config.processBypassIterations +
            config.processHitIterations +
            config.cacheReadIterations)
      },
      summaryByType: buildTypeSummary(grouped),
      perCandidate: results
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await app.close();
  }
}

function applyEnv() {
  setDefaultEnv("NODE_ENV", "test");
  setDefaultEnv("AUTH_REPOSITORY_DRIVER", "memory");
  setDefaultEnv("CONTRACT_VERSION", "1.0.0");
  setDefaultEnv("SWAGGER_ENABLED", "false");
  setDefaultEnv("SWAGGER_PATH", "docs");
  setDefaultEnv("SWAGGER_JSON_PATH", "docs-json");
  setDefaultEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173");
}

function setDefaultEnv(name: string, value: string): void {
  if (!process.env[name]) {
    process.env[name] = value;
  }
}

function parseArgs(args: string[]): BenchConfig {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (!raw.startsWith("--")) {
      continue;
    }
    const key = raw.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      values.set(key, "true");
      continue;
    }
    values.set(key, next);
    index += 1;
  }

  return {
    maxCandidatesPerType: parsePositiveInt(values.get("maxCandidatesPerType"), 10),
    processBypassIterations: parsePositiveInt(values.get("processBypassIterations"), 100),
    processHitIterations: parsePositiveInt(values.get("processHitIterations"), 250),
    cacheReadIterations: parsePositiveInt(values.get("cacheReadIterations"), 350)
  };
}

function parsePositiveInt(input: string | undefined, fallback: number): number {
  if (!input) {
    return fallback;
  }
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

async function loginAndGetToken(
  client: HttpClient,
  username: string,
  password: string
): Promise<string> {
  const login = await client
    .post("/api/v1/auth/login")
    .send({ username, password })
    .expect(200);
  return login.body.data.session.accessToken as string;
}

async function fetchCandidates(
  client: HttpClient,
  token: string,
  maxPerType: number
): Promise<BenchCandidate[]> {
  const placeables = await listIds(
    client,
    token,
    "/api/v1/catalog/placeables?limit=100&offset=0",
    "templateId"
  );
  const creatures = await listIds(
    client,
    token,
    "/api/v1/catalog/creatures?limit=100&offset=0",
    "templateId"
  );
  const items = await listIds(
    client,
    token,
    "/api/v1/catalog/items?limit=100&offset=0",
    "templateId"
  );
  const areas = await listIds(client, token, "/api/v1/areas?limit=100&offset=0", "areaId");

  return [
    ...placeables.slice(0, maxPerType).map((id) => ({ type: "placeable" as const, id })),
    ...creatures.slice(0, maxPerType).map((id) => ({ type: "creature" as const, id })),
    ...items.slice(0, maxPerType).map((id) => ({ type: "item" as const, id })),
    ...areas.slice(0, maxPerType).map((id) => ({ type: "area" as const, id }))
  ];
}

async function listIds(
  client: HttpClient,
  token: string,
  url: string,
  field: "templateId" | "areaId"
): Promise<string[]> {
  const response = await client
    .get(url)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  const items = response.body.data.items as Array<Record<string, unknown>>;
  return items
    .map((item) => item[field])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

async function primeCache(
  client: HttpClient,
  token: string,
  candidate: BenchCandidate
): Promise<string> {
  const response = await processCandidate(client, token, candidate, false);
  return response.body.data.cache.key as string;
}

async function processCandidate(
  client: HttpClient,
  token: string,
  candidate: BenchCandidate,
  bypassCache: boolean
) {
  if (candidate.type === "area") {
    return client
      .post(`/api/v1/areas/${candidate.id}/process`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bypassCache })
      .expect(200);
  }

  const basePath =
    candidate.type === "placeable"
      ? "/api/v1/catalog/placeables/process"
      : candidate.type === "creature"
        ? "/api/v1/catalog/creatures/process"
        : "/api/v1/catalog/items/process";

  return client
    .post(basePath)
    .set("Authorization", `Bearer ${token}`)
    .send({
      templateId: candidate.id,
      bypassCache,
      includeBenchmarkMetadata: true
    })
    .expect(200);
}

async function getCachedCandidate(
  client: HttpClient,
  token: string,
  candidate: BenchCandidate,
  cacheKey: string
) {
  const path =
    candidate.type === "placeable"
      ? `/api/v1/catalog/placeables/cache/${cacheKey}`
      : candidate.type === "creature"
        ? `/api/v1/catalog/creatures/cache/${cacheKey}`
        : candidate.type === "item"
          ? `/api/v1/catalog/items/cache/${cacheKey}`
          : `/api/v1/areas/cache/${cacheKey}`;

  return client
    .get(path)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
}

async function runIterations(iterations: number, operation: () => Promise<void>): Promise<number[]> {
  const durations: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = process.hrtime.bigint();
    await operation();
    const ended = process.hrtime.bigint();
    durations.push(Number(ended - started) / 1_000_000);
  }
  return durations;
}

function summarizeDurations(values: number[]): DurationSummary {
  if (values.length === 0) {
    return {
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return {
    minMs: roundMetric(sorted[0]),
    maxMs: roundMetric(sorted[sorted.length - 1]),
    avgMs: roundMetric(total / sorted.length),
    p50Ms: roundMetric(percentile(sorted, 0.5)),
    p95Ms: roundMetric(percentile(sorted, 0.95)),
    p99Ms: roundMetric(percentile(sorted, 0.99))
  };
}

function percentile(sorted: number[], ratio: number): number {
  const index = Math.ceil(sorted.length * ratio) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function groupByType(results: CandidateBenchResult[]): Record<BenchType, CandidateBenchResult[]> {
  return {
    placeable: results.filter((result) => result.type === "placeable"),
    creature: results.filter((result) => result.type === "creature"),
    item: results.filter((result) => result.type === "item"),
    area: results.filter((result) => result.type === "area")
  };
}

function buildTypeSummary(grouped: Record<BenchType, CandidateBenchResult[]>) {
  return {
    placeable: summarizeType(grouped.placeable),
    creature: summarizeType(grouped.creature),
    item: summarizeType(grouped.item),
    area: summarizeType(grouped.area)
  };
}

function summarizeType(results: CandidateBenchResult[]) {
  const processBypass = flattenMetric(results, "processBypass");
  const processHit = flattenMetric(results, "processHit");
  const cacheRead = flattenMetric(results, "cacheRead");

  return {
    candidates: results.length,
    processBypass,
    processHit,
    cacheRead
  };
}

function flattenMetric(
  results: CandidateBenchResult[],
  key: "processBypass" | "processHit" | "cacheRead"
): DurationSummary {
  const values = results.flatMap((result) => {
    const metric = result[key];
    return [metric.minMs, metric.p50Ms, metric.p95Ms, metric.p99Ms, metric.maxMs];
  });

  return summarizeDurations(values);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
