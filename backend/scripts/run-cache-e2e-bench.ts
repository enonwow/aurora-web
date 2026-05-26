import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

type BenchType = "placeable" | "creature" | "item" | "area";
type RouteGroup = "processBypass" | "processHit" | "cacheRead" | "assetDelivery";
type DeliveryStatus =
  | "executed"
  | "unsupported_type"
  | "no_manifest_assets"
  | "endpoint_unavailable";

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
  assetDeliveryIterations: number;
}

interface RouteSummary {
  count: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

interface DeliveryBenchResult {
  status: DeliveryStatus;
  cacheKey: string;
  requestCount: number;
  assetId?: string;
  routePath?: string;
  reason?: string;
  metrics?: DurationSummary;
}

interface CandidateBenchResult {
  type: BenchType;
  id: string;
  cacheKey: string;
  processBypass: DurationSummary;
  processHit: DurationSummary;
  cacheRead: DurationSummary;
  assetDelivery: DeliveryBenchResult;
}

type HttpClient = ReturnType<typeof supertest.agent>;

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
    const routeDurations = createRouteDurationsBucket();
    const routeDurationsByType = createRouteDurationsByTypeBucket();
    let requestCount = 0;

    for (const candidate of candidates) {
      const cacheKey = await primeCache(client, token, candidate);
      requestCount += 1;

      const processBypassDurations = await runIterations(
        config.processBypassIterations,
        async () => {
          await processCandidate(client, token, candidate, true);
        }
      );
      requestCount += config.processBypassIterations;
      routeDurations.processBypass.push(...processBypassDurations);
      routeDurationsByType[candidate.type].processBypass.push(...processBypassDurations);

      const processHitDurations = await runIterations(config.processHitIterations, async () => {
        await processCandidate(client, token, candidate, false);
      });
      requestCount += config.processHitIterations;
      routeDurations.processHit.push(...processHitDurations);
      routeDurationsByType[candidate.type].processHit.push(...processHitDurations);

      const cacheReadDurations = await runIterations(config.cacheReadIterations, async () => {
        await getCachedCandidate(client, token, candidate, cacheKey);
      });
      requestCount += config.cacheReadIterations;
      routeDurations.cacheRead.push(...cacheReadDurations);
      routeDurationsByType[candidate.type].cacheRead.push(...cacheReadDurations);

      const delivery = await benchmarkAssetDelivery(
        client,
        token,
        candidate,
        cacheKey,
        config.assetDeliveryIterations
      );
      if (delivery.status === "executed" && delivery.metrics) {
        routeDurations.assetDelivery.push(...(delivery as ExecutedDeliveryBenchResult).durations);
        routeDurationsByType[candidate.type].assetDelivery.push(
          ...(delivery as ExecutedDeliveryBenchResult).durations
        );
      }
      requestCount += delivery.requestCount;

      results.push({
        type: candidate.type,
        id: candidate.id,
        cacheKey,
        processBypass: summarizeDurations(processBypassDurations),
        processHit: summarizeDurations(processHitDurations),
        cacheRead: summarizeDurations(cacheReadDurations),
        assetDelivery: stripDeliveryDurations(delivery)
      });
    }

    const finishedAt = new Date().toISOString();
    const grouped = groupByType(results);
    const deliverySummary = summarizeDelivery(results);
    const output = {
      generatedAt: finishedAt,
      timing: {
        startedAt,
        finishedAt
      },
      config,
      totals: {
        candidates: results.length,
        requests: requestCount,
        delivery: deliverySummary
      },
      routeGroups: {
        processBypass: summarizeRoute(routeDurations.processBypass),
        processHit: summarizeRoute(routeDurations.processHit),
        cacheRead: summarizeRoute(routeDurations.cacheRead),
        assetDelivery: summarizeRoute(routeDurations.assetDelivery)
      },
      summaryByType: buildTypeSummary(grouped),
      routeGroupsByType: {
        placeable: summarizeRouteGroups(routeDurationsByType.placeable),
        creature: summarizeRouteGroups(routeDurationsByType.creature),
        item: summarizeRouteGroups(routeDurationsByType.item),
        area: summarizeRouteGroups(routeDurationsByType.area)
      },
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
  setDefaultEnv("ENABLE_BLOB_ASSET_LOOKUP_IN_TEST", "true");
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
    cacheReadIterations: parsePositiveInt(values.get("cacheReadIterations"), 350),
    assetDeliveryIterations: parsePositiveInt(values.get("assetDeliveryIterations"), 150)
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

interface ExecutedDeliveryBenchResult extends DeliveryBenchResult {
  status: "executed";
  durations: number[];
  metrics: DurationSummary;
}

async function benchmarkAssetDelivery(
  client: HttpClient,
  token: string,
  candidate: BenchCandidate,
  cacheKey: string,
  iterations: number
): Promise<DeliveryBenchResult | ExecutedDeliveryBenchResult> {
  if (candidate.type !== "placeable") {
    return {
      status: "unsupported_type",
      cacheKey,
      requestCount: 0,
      reason: "delivery_endpoint_supported_for_placeables_only"
    };
  }

  const cached = await getCachedCandidate(client, token, candidate, cacheKey);
  const manifestAssets = extractPlaceableAssetIds(cached.body);
  if (manifestAssets.length === 0) {
    return benchmarkTextureFallbackDelivery(
      client,
      token,
      cacheKey,
      iterations,
      1
    );
  }

  const assetId = manifestAssets[0];
  const routePath = `/api/v1/catalog/placeables/cache/${cacheKey}/assets/${assetId}`;
  const probe = await client
    .get(routePath)
    .set("Authorization", `Bearer ${token}`);

  if (probe.status !== 200) {
    return {
      status: "endpoint_unavailable",
      cacheKey,
      requestCount: 2,
      assetId,
      routePath,
      reason: `probe_status_${probe.status}`
    };
  }

  const durations = await runIterations(iterations, async () => {
    await client
      .get(routePath)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  return {
    status: "executed",
    cacheKey,
    requestCount: 2 + iterations,
    assetId,
    routePath,
    durations,
    metrics: summarizeDurations(durations)
  };
}

async function benchmarkTextureFallbackDelivery(
  client: HttpClient,
  token: string,
  cacheKey: string,
  iterations: number,
  requestCountSoFar: number
): Promise<DeliveryBenchResult | ExecutedDeliveryBenchResult> {
  const contractsResponse = await client
    .get("/api/v1/settings/runtime/module-cache/textures/contracts?limit=1&offset=0")
    .set("Authorization", `Bearer ${token}`);

  requestCountSoFar += 1;
  if (contractsResponse.status !== 200) {
    return {
      status: "endpoint_unavailable",
      cacheKey,
      requestCount: requestCountSoFar,
      routePath: "/api/v1/settings/runtime/module-cache/textures/contracts",
      reason: `texture_contract_probe_status_${contractsResponse.status}`
    };
  }

  const textureContract = extractFirstTextureContract(contractsResponse.body);
  if (!textureContract) {
    return {
      status: "no_manifest_assets",
      cacheKey,
      requestCount: requestCountSoFar,
      reason: "placeable_manifest_has_no_assets_and_texture_fallback_empty"
    };
  }

  const routePath = textureContract.deliveryPath;
  const probe = await client
    .get(routePath)
    .set("Authorization", `Bearer ${token}`);
  requestCountSoFar += 1;
  if (probe.status !== 200) {
    return {
      status: "endpoint_unavailable",
      cacheKey,
      requestCount: requestCountSoFar,
      assetId: textureContract.textureId,
      routePath,
      reason: `texture_fallback_probe_status_${probe.status}`
    };
  }

  const durations = await runIterations(iterations, async () => {
    await client
      .get(routePath)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  return {
    status: "executed",
    cacheKey,
    requestCount: requestCountSoFar + iterations,
    assetId: textureContract.textureId,
    routePath,
    durations,
    metrics: summarizeDurations(durations)
  };
}

function extractPlaceableAssetIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (!data || typeof data !== "object") {
    return [];
  }

  const placeable = (data as Record<string, unknown>).placeable;
  if (!placeable || typeof placeable !== "object") {
    return [];
  }

  const assetManifest = (placeable as Record<string, unknown>).assetManifest;
  if (!assetManifest || typeof assetManifest !== "object") {
    return [];
  }

  const assets = (assetManifest as Record<string, unknown>).assets;
  if (!Array.isArray(assets)) {
    return [];
  }

  return assets
    .map((asset) => {
      if (!asset || typeof asset !== "object") {
        return null;
      }
      const value = (asset as Record<string, unknown>).assetId;
      return typeof value === "string" && value.length > 0 ? value : null;
    })
    .filter((value): value is string => value !== null);
}

function extractFirstTextureContract(
  payload: unknown
): { textureId: string; deliveryPath: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (!data || typeof data !== "object") {
    return null;
  }

  const assets = (data as Record<string, unknown>).assets;
  if (!Array.isArray(assets) || assets.length === 0) {
    return null;
  }

  const first = assets[0];
  if (!first || typeof first !== "object") {
    return null;
  }

  const textureId = (first as Record<string, unknown>).textureId;
  const deliveryPath = (first as Record<string, unknown>).deliveryPath;
  if (
    typeof textureId !== "string" ||
    textureId.length === 0 ||
    typeof deliveryPath !== "string" ||
    deliveryPath.length === 0
  ) {
    return null;
  }

  return {
    textureId,
    deliveryPath
  };
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
    cacheRead,
    delivery: summarizeDeliveryForType(results)
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

function createRouteDurationsBucket(): Record<RouteGroup, number[]> {
  return {
    processBypass: [],
    processHit: [],
    cacheRead: [],
    assetDelivery: []
  };
}

function createRouteDurationsByTypeBucket(): Record<BenchType, Record<RouteGroup, number[]>> {
  return {
    placeable: createRouteDurationsBucket(),
    creature: createRouteDurationsBucket(),
    item: createRouteDurationsBucket(),
    area: createRouteDurationsBucket()
  };
}

function summarizeRoute(values: number[]): RouteSummary {
  const metrics = summarizeDurations(values);
  return {
    count: values.length,
    p50Ms: metrics.p50Ms,
    p95Ms: metrics.p95Ms,
    p99Ms: metrics.p99Ms
  };
}

function summarizeRouteGroups(groups: Record<RouteGroup, number[]>) {
  return {
    processBypass: summarizeRoute(groups.processBypass),
    processHit: summarizeRoute(groups.processHit),
    cacheRead: summarizeRoute(groups.cacheRead),
    assetDelivery: summarizeRoute(groups.assetDelivery)
  };
}

function summarizeDelivery(results: CandidateBenchResult[]) {
  const eligible = results.filter((result) => result.type === "placeable");
  const executed = eligible.filter((result) => result.assetDelivery.status === "executed");
  const skippedByReason = eligible.reduce<Record<string, number>>((acc, result) => {
    if (result.assetDelivery.status === "executed") {
      return acc;
    }
    const reason = result.assetDelivery.reason ?? result.assetDelivery.status;
    acc[reason] = (acc[reason] ?? 0) + 1;
    return acc;
  }, {});

  return {
    eligibleCandidates: eligible.length,
    executedCandidates: executed.length,
    skippedByReason
  };
}

function summarizeDeliveryForType(results: CandidateBenchResult[]) {
  const eligible = results.filter((result) => result.type === "placeable");
  if (eligible.length === 0) {
    return {
      eligibleCandidates: 0,
      executedCandidates: 0,
      skippedByReason: {}
    };
  }

  const executed = eligible.filter((result) => result.assetDelivery.status === "executed");
  const skippedByReason = eligible.reduce<Record<string, number>>((acc, result) => {
    if (result.assetDelivery.status === "executed") {
      return acc;
    }
    const reason = result.assetDelivery.reason ?? result.assetDelivery.status;
    acc[reason] = (acc[reason] ?? 0) + 1;
    return acc;
  }, {});

  return {
    eligibleCandidates: eligible.length,
    executedCandidates: executed.length,
    skippedByReason
  };
}

function stripDeliveryDurations(
  result: DeliveryBenchResult | ExecutedDeliveryBenchResult
): DeliveryBenchResult {
  if (result.status !== "executed") {
    return result;
  }

  return {
    status: result.status,
    cacheKey: result.cacheKey,
    requestCount: result.requestCount,
    assetId: result.assetId,
    routePath: result.routePath,
    metrics: result.metrics
  };
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
