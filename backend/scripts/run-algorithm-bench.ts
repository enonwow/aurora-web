import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import supertest = require("supertest");
import { AppModule } from "../src/app.module";
import { AppConfigService } from "../src/common/config/app-config.service";
import { setupCors } from "../src/common/http/cors";
import { setupSwagger } from "../src/common/openapi/swagger";

type BenchProfile = "small" | "medium" | "large";
type EntityType = "placeable" | "tile" | "sound" | "area";

interface BenchConfig {
  profile: BenchProfile;
  maxCandidatesPerType: number;
  iterations: number;
  warmupIterations: number;
  areaLoadIterations: number;
  areaLoadWarmupIterations: number;
  areaIterations: number;
  areaWarmupIterations: number;
  areaCacheReadIterations: number;
  queueJobs: number;
  queuePollMs: number;
  queueTimeoutMs: number;
  saveOutput: boolean;
  outputPath: string;
}

interface DurationSummary {
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

interface MemorySnapshot {
  label: string;
  at: string;
  rssMb: number;
  heapUsedMb: number;
  externalMb: number;
  arrayBuffersMb: number;
}

interface QueueJobResult {
  jobId: string;
  targetId: string;
  finalStatus: string;
  attemptCount?: number;
  enqueueLatencyMs: number;
  runtimeLatencyMs?: number;
  wallClockLatencyMs?: number;
}

type HttpClient = ReturnType<typeof supertest.agent>;

async function main() {
  const config = parseArgs(process.argv.slice(2));
  applyEnv();

  const memorySnapshots: MemorySnapshot[] = [];
  memorySnapshots.push(captureMemory("startup"));

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

  const startedAt = new Date().toISOString();
  const client = supertest.agent(app.getHttpServer());

  try {
    const token = await loginAndGetToken(client, "builder.user", "builder123");
    const candidates = await resolveCandidates(client, token, config.maxCandidatesPerType);

    memorySnapshots.push(captureMemory("after-bootstrap"));

    const placeablesCold = await runPlaceableBenchmark(
      client,
      token,
      candidates.placeableIds,
      config.iterations,
      config.warmupIterations,
      true
    );
    const placeablesWarm = await runPlaceableBenchmark(
      client,
      token,
      candidates.placeableIds,
      config.iterations,
      config.warmupIterations,
      false
    );
    memorySnapshots.push(captureMemory("after-placeables"));

    const tilesCold = await runTileBenchmark(
      client,
      token,
      candidates.tileIds,
      config.iterations,
      config.warmupIterations,
      true
    );
    const tilesWarm = await runTileBenchmark(
      client,
      token,
      candidates.tileIds,
      config.iterations,
      config.warmupIterations,
      false
    );
    memorySnapshots.push(captureMemory("after-tiles"));

    const soundsCold = await runSoundBenchmark(
      client,
      token,
      candidates.soundIds,
      config.iterations,
      config.warmupIterations,
      true
    );
    const soundsWarm = await runSoundBenchmark(
      client,
      token,
      candidates.soundIds,
      config.iterations,
      config.warmupIterations,
      false
    );
    memorySnapshots.push(captureMemory("after-sounds"));

    const areasLoad = await runAreaLoadBenchmark(
      client,
      token,
      config.areaLoadIterations,
      config.areaLoadWarmupIterations
    );
    memorySnapshots.push(captureMemory("after-areas-load"));

    const areasCold = await runAreaProcessingBenchmark(
      client,
      token,
      candidates.areaIds,
      config.areaIterations,
      config.areaWarmupIterations,
      true
    );
    const areasWarm = await runAreaProcessingBenchmark(
      client,
      token,
      candidates.areaIds,
      config.areaIterations,
      config.areaWarmupIterations,
      false
    );
    const areaCacheRead = await runAreaCacheReadBenchmark(
      client,
      token,
      candidates.areaIds,
      config.areaCacheReadIterations
    );
    memorySnapshots.push(captureMemory("after-areas"));

    const queueBenchmark = await runQueueBenchmark(client, token, {
      placeableIds: candidates.placeableIds,
      jobs: config.queueJobs,
      pollMs: config.queuePollMs,
      timeoutMs: config.queueTimeoutMs
    });
    memorySnapshots.push(captureMemory("after-queue"));

    const finishedAt = new Date().toISOString();
    const peakRssMb = roundMetric(
      memorySnapshots.reduce((max, snapshot) => Math.max(max, snapshot.rssMb), 0)
    );

    const output = {
      specVersion: "alg-bench-v1",
      generatedAt: finishedAt,
      profile: config.profile,
      timing: {
        startedAt,
        finishedAt
      },
      config: {
        maxCandidatesPerType: config.maxCandidatesPerType,
        iterations: config.iterations,
        warmupIterations: config.warmupIterations,
        areaLoadIterations: config.areaLoadIterations,
        areaLoadWarmupIterations: config.areaLoadWarmupIterations,
        areaIterations: config.areaIterations,
        areaWarmupIterations: config.areaWarmupIterations,
        areaCacheReadIterations: config.areaCacheReadIterations,
        queueJobs: config.queueJobs,
        queuePollMs: config.queuePollMs,
        queueTimeoutMs: config.queueTimeoutMs
      },
      datasets: candidates,
      memory: {
        peakRssMb,
        snapshots: memorySnapshots
      },
      results: {
        placeables: {
          cold: placeablesCold,
          warm: placeablesWarm
        },
        tiles: {
          cold: tilesCold,
          warm: tilesWarm
        },
        sounds: {
          cold: soundsCold,
          warm: soundsWarm
        },
        areas: {
          load: areasLoad,
          cold: areasCold,
          warm: areasWarm,
          cacheRead: areaCacheRead
        },
        queue: queueBenchmark
      }
    };

    if (config.saveOutput) {
      await mkdir(path.dirname(config.outputPath), { recursive: true });
      await writeFile(config.outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ...output, savedTo: config.saveOutput ? config.outputPath : null }, null, 2));
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
  setDefaultEnv("PROCESSING_JOBS_INLINE_ENABLED", "true");
}

function setDefaultEnv(name: string, value: string): void {
  if (!process.env[name]) {
    process.env[name] = value;
  }
}

function parseArgs(args: string[]): BenchConfig {
  const values = parseArgsMap(args);
  const profile = parseProfile(values.get("profile"));
  const defaults = profileDefaults(profile);
  const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const outputPath =
    values.get("output") ??
    path.resolve(process.cwd(), "docs", "benchmark", `algorithm-benchmark-${timestamp}.json`);

  return {
    profile,
    maxCandidatesPerType: parsePositiveInt(
      values.get("maxCandidatesPerType"),
      defaults.maxCandidatesPerType
    ),
    iterations: parsePositiveInt(values.get("iterations"), defaults.iterations),
    warmupIterations: parseNonNegativeInt(values.get("warmupIterations"), defaults.warmupIterations),
    areaLoadIterations: parsePositiveInt(values.get("areaLoadIterations"), defaults.areaLoadIterations),
    areaLoadWarmupIterations: parseNonNegativeInt(
      values.get("areaLoadWarmupIterations"),
      defaults.areaLoadWarmupIterations
    ),
    areaIterations: parsePositiveInt(values.get("areaIterations"), defaults.areaIterations),
    areaWarmupIterations: parseNonNegativeInt(
      values.get("areaWarmupIterations"),
      defaults.areaWarmupIterations
    ),
    areaCacheReadIterations: parsePositiveInt(
      values.get("areaCacheReadIterations"),
      defaults.areaCacheReadIterations
    ),
    queueJobs: parsePositiveInt(values.get("queueJobs"), defaults.queueJobs),
    queuePollMs: parsePositiveInt(values.get("queuePollMs"), defaults.queuePollMs),
    queueTimeoutMs: parsePositiveInt(values.get("queueTimeoutMs"), defaults.queueTimeoutMs),
    saveOutput: parseBoolean(values.get("save"), true),
    outputPath
  };
}

function parseArgsMap(args: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (!raw.startsWith("--")) {
      continue;
    }
    const key = raw.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      result.set(key, "true");
      continue;
    }
    result.set(key, next);
    index += 1;
  }
  return result;
}

function parseProfile(input: string | undefined): BenchProfile {
  if (!input) {
    return "small";
  }
  if (input === "small" || input === "medium" || input === "large") {
    return input;
  }
  return "small";
}

function profileDefaults(profile: BenchProfile) {
  if (profile === "medium") {
    return {
      maxCandidatesPerType: 10,
      iterations: 120,
      warmupIterations: 15,
      areaLoadIterations: 20,
      areaLoadWarmupIterations: 3,
      areaIterations: 60,
      areaWarmupIterations: 8,
      areaCacheReadIterations: 160,
      queueJobs: 80,
      queuePollMs: 100,
      queueTimeoutMs: 45_000
    };
  }
  if (profile === "large") {
    return {
      maxCandidatesPerType: 20,
      iterations: 300,
      warmupIterations: 25,
      areaLoadIterations: 40,
      areaLoadWarmupIterations: 5,
      areaIterations: 120,
      areaWarmupIterations: 12,
      areaCacheReadIterations: 300,
      queueJobs: 200,
      queuePollMs: 125,
      queueTimeoutMs: 90_000
    };
  }
  return {
    maxCandidatesPerType: 5,
    iterations: 40,
    warmupIterations: 5,
    areaLoadIterations: 8,
    areaLoadWarmupIterations: 2,
    areaIterations: 20,
    areaWarmupIterations: 3,
    areaCacheReadIterations: 80,
    queueJobs: 20,
    queuePollMs: 75,
    queueTimeoutMs: 20_000
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

function parseNonNegativeInt(input: string | undefined, fallback: number): number {
  if (!input) {
    return fallback;
  }
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parseBoolean(input: string | undefined, fallback: boolean): boolean {
  if (!input) {
    return fallback;
  }
  const normalized = input.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

async function loginAndGetToken(
  client: HttpClient,
  username: string,
  password: string
): Promise<string> {
  const response = await client
    .post("/api/v1/auth/login")
    .send({ username, password })
    .expect(200);
  return response.body.data.session.accessToken as string;
}

async function resolveCandidates(client: HttpClient, token: string, maxPerType: number) {
  const placeableIds = await listIdsWithBenchmarkFallback(
    client,
    token,
    "placeable",
    "templateId",
    maxPerType
  );
  const tileIds = await listIdsWithBenchmarkFallback(client, token, "tile", "tileId", maxPerType);
  const soundIds = await listIdsWithBenchmarkFallback(
    client,
    token,
    "sound",
    "soundId",
    maxPerType
  );
  const areaIds = await listIdsWithBenchmarkFallback(client, token, "area", "areaId", maxPerType);

  return {
    placeableIds,
    tileIds,
    soundIds,
    areaIds
  };
}

async function listIdsWithBenchmarkFallback(
  client: HttpClient,
  token: string,
  type: EntityType,
  field: "templateId" | "tileId" | "soundId" | "areaId",
  maxPerType: number
): Promise<string[]> {
  const benchmarkRoute = `${listRouteFor(type)}?benchmark=true&limit=100&offset=0`;
  const fallbackRoute = `${listRouteFor(type)}?limit=100&offset=0`;

  const benchmarkIds = await listIds(client, token, benchmarkRoute, field);
  if (benchmarkIds.length > 0) {
    return benchmarkIds.slice(0, maxPerType);
  }

  const fallbackIds = await listIds(client, token, fallbackRoute, field);
  return fallbackIds.slice(0, maxPerType);
}

function listRouteFor(type: EntityType): string {
  if (type === "placeable") {
    return "/api/v1/catalog/placeables";
  }
  if (type === "tile") {
    return "/api/v1/catalog/tiles";
  }
  if (type === "sound") {
    return "/api/v1/catalog/sounds";
  }
  return "/api/v1/areas";
}

async function listIds(
  client: HttpClient,
  token: string,
  url: string,
  field: "templateId" | "tileId" | "soundId" | "areaId"
): Promise<string[]> {
  const response = await client.get(url).set("Authorization", `Bearer ${token}`).expect(200);
  const payload = response.body.data as { items?: Array<Record<string, unknown>> };
  if (!Array.isArray(payload.items)) {
    return [];
  }

  return payload.items
    .map((item) => item[field])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

async function runPlaceableBenchmark(
  client: HttpClient,
  token: string,
  templateIds: string[],
  iterations: number,
  warmupIterations: number,
  bypassCache: boolean
) {
  const response = await client
    .post("/api/v1/catalog/placeables/benchmark")
    .set("Authorization", `Bearer ${token}`)
    .send({
      templateIds,
      iterations,
      warmupIterations,
      bypassCache
    })
    .expect(200);

  return response.body.data as Record<string, unknown>;
}

async function runTileBenchmark(
  client: HttpClient,
  token: string,
  tileIds: string[],
  iterations: number,
  warmupIterations: number,
  bypassCache: boolean
) {
  const response = await client
    .post("/api/v1/catalog/tiles/benchmark")
    .set("Authorization", `Bearer ${token}`)
    .send({
      tileIds,
      iterations,
      warmupIterations,
      bypassCache
    })
    .expect(200);

  return response.body.data as Record<string, unknown>;
}

async function runSoundBenchmark(
  client: HttpClient,
  token: string,
  soundIds: string[],
  iterations: number,
  warmupIterations: number,
  bypassCache: boolean
) {
  const response = await client
    .post("/api/v1/catalog/sounds/benchmark")
    .set("Authorization", `Bearer ${token}`)
    .send({
      soundIds,
      iterations,
      warmupIterations,
      bypassCache
    })
    .expect(200);

  return response.body.data as Record<string, unknown>;
}

async function runAreaLoadBenchmark(
  client: HttpClient,
  token: string,
  iterations: number,
  warmupIterations: number
) {
  for (let warmup = 0; warmup < warmupIterations; warmup += 1) {
    await executeAreaLoadIteration(client, token);
  }

  const durations: number[] = [];
  const areaCounts: number[] = [];
  const startedAt = new Date().toISOString();

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const started = process.hrtime.bigint();
    const areaCount = await executeAreaLoadIteration(client, token);
    const ended = process.hrtime.bigint();
    durations.push(Number(ended - started) / 1_000_000);
    areaCounts.push(areaCount);
  }

  return {
    config: {
      iterations,
      warmupIterations
    },
    timing: {
      startedAt,
      finishedAt: new Date().toISOString()
    },
    metrics: {
      overall: summarizeDurations(durations),
      areaCount: summarizeIntegerValues(areaCounts)
    }
  };
}

async function executeAreaLoadIteration(client: HttpClient, token: string): Promise<number> {
  const listResponse = await client
    .get("/api/v1/areas?limit=100&offset=0")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  const items = listResponse.body.data?.items as Array<{ areaId?: string }> | undefined;
  const areaIds = Array.isArray(items)
    ? items
        .map((item) => item.areaId)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];

  const detailSample = areaIds.slice(0, 5);
  for (const areaId of detailSample) {
    await client
      .get(`/api/v1/areas/${encodeURIComponent(areaId)}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  }

  return areaIds.length;
}

async function runAreaProcessingBenchmark(
  client: HttpClient,
  token: string,
  areaIds: string[],
  iterations: number,
  warmupIterations: number,
  bypassCache: boolean
) {
  const perCandidate: Array<{ areaId: string; metrics: DurationSummary }> = [];
  const allDurations: number[] = [];
  const startedAt = new Date().toISOString();

  for (const areaId of areaIds) {
    for (let warmup = 0; warmup < warmupIterations; warmup += 1) {
      await processArea(client, token, areaId, true);
    }

    const durations: number[] = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const started = process.hrtime.bigint();
      await processArea(client, token, areaId, bypassCache);
      const ended = process.hrtime.bigint();
      const elapsedMs = Number(ended - started) / 1_000_000;
      durations.push(elapsedMs);
      allDurations.push(elapsedMs);
    }

    perCandidate.push({
      areaId,
      metrics: summarizeDurations(durations)
    });
  }

  return {
    config: {
      iterations,
      warmupIterations,
      bypassCache,
      candidates: areaIds.length
    },
    timing: {
      startedAt,
      finishedAt: new Date().toISOString()
    },
    metrics: {
      overall: summarizeDurations(allDurations),
      perCandidate
    }
  };
}

async function processArea(
  client: HttpClient,
  token: string,
  areaId: string,
  bypassCache: boolean
): Promise<string> {
  const response = await client
    .post(`/api/v1/areas/${encodeURIComponent(areaId)}/process`)
    .set("Authorization", `Bearer ${token}`)
    .send({ bypassCache })
    .expect(200);

  return response.body.data.cache.key as string;
}

async function runAreaCacheReadBenchmark(
  client: HttpClient,
  token: string,
  areaIds: string[],
  iterations: number
) {
  const primeKeys = new Map<string, string>();
  for (const areaId of areaIds) {
    const key = await processArea(client, token, areaId, false);
    primeKeys.set(areaId, key);
  }

  const perCandidate: Array<{ areaId: string; cacheKey: string; metrics: DurationSummary }> = [];
  const allDurations: number[] = [];
  const startedAt = new Date().toISOString();

  for (const areaId of areaIds) {
    const cacheKey = primeKeys.get(areaId);
    if (!cacheKey) {
      continue;
    }
    const durations: number[] = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const started = process.hrtime.bigint();
      await client
        .get(`/api/v1/areas/cache/${encodeURIComponent(cacheKey)}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const ended = process.hrtime.bigint();
      const elapsedMs = Number(ended - started) / 1_000_000;
      durations.push(elapsedMs);
      allDurations.push(elapsedMs);
    }

    perCandidate.push({
      areaId,
      cacheKey,
      metrics: summarizeDurations(durations)
    });
  }

  return {
    config: {
      iterations,
      candidates: areaIds.length
    },
    timing: {
      startedAt,
      finishedAt: new Date().toISOString()
    },
    metrics: {
      overall: summarizeDurations(allDurations),
      perCandidate
    }
  };
}

async function runQueueBenchmark(
  client: HttpClient,
  token: string,
  input: {
    placeableIds: string[];
    jobs: number;
    pollMs: number;
    timeoutMs: number;
  }
) {
  const targetIds = input.placeableIds.length > 0 ? input.placeableIds : ["plc_market_stall_001"];
  const beforeMetrics = await getQueueMetrics(client, token);
  const enqueueLatencies: number[] = [];
  const queueStartMs = Date.now();
  const pending = new Map<string, { targetId: string; enqueuedAtMs: number; enqueueLatencyMs: number }>();
  const terminal: QueueJobResult[] = [];

  for (let index = 0; index < input.jobs; index += 1) {
    const targetId = targetIds[index % targetIds.length];
    const started = process.hrtime.bigint();
    const response = await client
      .post("/api/v1/processing/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        task: "process_placeable",
        targetId,
        options: {
          bypassCache: false,
          includeBenchmarkMetadata: false
        }
      })
      .expect(202);
    const ended = process.hrtime.bigint();
    const enqueueLatencyMs = Number(ended - started) / 1_000_000;
    enqueueLatencies.push(enqueueLatencyMs);

    const jobId = response.body.data.jobId as string;
    pending.set(jobId, {
      targetId,
      enqueuedAtMs: Date.now(),
      enqueueLatencyMs
    });
  }

  const timeoutAtMs = Date.now() + input.timeoutMs;
  while (pending.size > 0 && Date.now() < timeoutAtMs) {
    const jobIds = Array.from(pending.keys());
    for (const jobId of jobIds) {
      const response = await client
        .get(`/api/v1/processing/jobs/${encodeURIComponent(jobId)}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const job = response.body.data as Record<string, unknown>;
      const status = typeof job.status === "string" ? job.status : "unknown";
      if (!isTerminalStatus(status)) {
        continue;
      }

      const pendingJob = pending.get(jobId);
      if (!pendingJob) {
        continue;
      }
      pending.delete(jobId);

      terminal.push({
        jobId,
        targetId: pendingJob.targetId,
        finalStatus: status,
        attemptCount: typeof job.attemptCount === "number" ? job.attemptCount : undefined,
        enqueueLatencyMs: roundMetric(pendingJob.enqueueLatencyMs),
        runtimeLatencyMs: parseRuntimeLatencyMs(job),
        wallClockLatencyMs: roundMetric(Date.now() - pendingJob.enqueuedAtMs)
      });
    }

    if (pending.size > 0) {
      await sleep(input.pollMs);
    }
  }

  const timedOutJobIds = Array.from(pending.keys());
  for (const jobId of timedOutJobIds) {
    const pendingJob = pending.get(jobId);
    if (!pendingJob) {
      continue;
    }
    terminal.push({
      jobId,
      targetId: pendingJob.targetId,
      finalStatus: "timeout",
      enqueueLatencyMs: roundMetric(pendingJob.enqueueLatencyMs),
      wallClockLatencyMs: roundMetric(Date.now() - pendingJob.enqueuedAtMs)
    });
  }

  const afterMetrics = await getQueueMetrics(client, token);
  const runtimeLatencies = terminal
    .map((result) => result.runtimeLatencyMs)
    .filter((value): value is number => typeof value === "number");
  const wallClockLatencies = terminal
    .map((result) => result.wallClockLatencyMs)
    .filter((value): value is number => typeof value === "number");

  const statusCounts = terminal.reduce<Record<string, number>>((acc, item) => {
    acc[item.finalStatus] = (acc[item.finalStatus] ?? 0) + 1;
    return acc;
  }, {});

  return {
    config: {
      jobs: input.jobs,
      pollMs: input.pollMs,
      timeoutMs: input.timeoutMs
    },
    timing: {
      startedAt: new Date(queueStartMs).toISOString(),
      finishedAt: new Date().toISOString()
    },
    metrics: {
      enqueue: summarizeDurations(enqueueLatencies),
      runtime: summarizeDurations(runtimeLatencies),
      wallClock: summarizeDurations(wallClockLatencies)
    },
    statusCounts,
    pendingTimeouts: timedOutJobIds.length,
    queueMetrics: {
      before: beforeMetrics,
      after: afterMetrics
    },
    jobs: terminal
  };
}

function parseRuntimeLatencyMs(job: Record<string, unknown>): number | undefined {
  const startedAt = typeof job.startedAt === "string" ? Date.parse(job.startedAt) : Number.NaN;
  const finishedAt = typeof job.finishedAt === "string" ? Date.parse(job.finishedAt) : Number.NaN;
  if (Number.isNaN(startedAt) || Number.isNaN(finishedAt)) {
    return undefined;
  }

  const durationMs = finishedAt - startedAt;
  if (durationMs < 0) {
    return undefined;
  }
  return roundMetric(durationMs);
}

function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

async function getQueueMetrics(client: HttpClient, token: string) {
  const response = await client
    .get("/api/v1/processing/jobs/metrics?windowSize=1000")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  return response.body.data as Record<string, unknown>;
}

function summarizeDurations(durations: number[]): DurationSummary {
  if (durations.length === 0) {
    return {
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    };
  }

  const sorted = [...durations].sort((left, right) => left - right);
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

function summarizeIntegerValues(values: number[]) {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    min,
    max,
    avg: roundMetric(avg)
  };
}

function percentile(sorted: number[], ratio: number): number {
  const index = Math.ceil(sorted.length * ratio) - 1;
  const boundedIndex = Math.max(0, Math.min(sorted.length - 1, index));
  return sorted[boundedIndex];
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function captureMemory(label: string): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    label,
    at: new Date().toISOString(),
    rssMb: roundMetric(usage.rss / 1024 / 1024),
    heapUsedMb: roundMetric(usage.heapUsed / 1024 / 1024),
    externalMb: roundMetric(usage.external / 1024 / 1024),
    arrayBuffersMb: roundMetric(usage.arrayBuffers / 1024 / 1024)
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
