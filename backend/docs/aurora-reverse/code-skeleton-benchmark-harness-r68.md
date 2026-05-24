# E6 Code Skeleton: Benchmark Harness (R68)

## 1) Cel i zakres

Ten szkic definiuje minimalny, tani w utrzymaniu benchmark harness dla backendu Aurora:

- jeden runner, wiele scenariuszy,
- profile CI (`smoke`, `pr`, `nightly`),
- stabilny kontrakt collectorow metryk,
- prosty format output do trendowania.

## 2) Zasady projektowe (minimalny koszt utrzymania)

- Keep it boring: zero framework lock-in, TypeScript + Node APIs.
- Single source of truth: wszystkie profile i scenariusze w jednym `bench.config.ts`.
- Deterministic defaults: stale seed, stale warmup/runs, stale timeout.
- Narrow contracts: collectory zwracaja tylko uzgodniony JSON schema.
- Fail soft: collector failure nie wysadza całego runa (oznaczany jako warning).

## 3) Proponowana struktura katalogow

```txt
backend/
  bench/
    bench.config.ts
    runner.ts
    profiles.ts
    scenarios/
      http-latency.scenario.ts
      db-read.scenario.ts
    collectors/
      base.contract.ts
      latency.collector.ts
      throughput.collector.ts
      resource.collector.ts
    reporters/
      json.reporter.ts
      markdown.reporter.ts
    contracts/
      benchmark-result.schema.json
```

## 4) Kontrakt benchmark harness

```ts
// bench/collectors/base.contract.ts
export type BenchProfile = "smoke" | "pr" | "nightly";

export interface BenchContext {
  runId: string;
  profile: BenchProfile;
  seed: number;
  startedAt: string; // ISO
  tags: string[];
}

export interface ScenarioSpec {
  id: string;
  description: string;
  timeoutMs: number;
  warmupIterations: number;
  measuredIterations: number;
  execute(ctx: BenchContext): Promise<void>;
}

export interface CollectorSample {
  key: string; // np. latency.p95_ms
  value: number;
  unit: "ms" | "rps" | "bytes" | "percent" | "count";
  better: "lower" | "higher";
}

export interface CollectorContract {
  id: string;
  setup?(ctx: BenchContext): Promise<void>;
  collect(ctx: BenchContext): Promise<CollectorSample[]>;
  teardown?(ctx: BenchContext): Promise<void>;
}
```

## 5) Skeleton runnera

```ts
// bench/runner.ts
import { loadProfile } from "./profiles";
import type { BenchContext, ScenarioSpec, CollectorContract } from "./collectors/base.contract";

export async function runBench(profileName: "smoke" | "pr" | "nightly") {
  const profile = loadProfile(profileName);
  const ctx: BenchContext = {
    runId: `${Date.now()}`,
    profile: profileName,
    seed: profile.seed,
    startedAt: new Date().toISOString(),
    tags: profile.tags ?? [],
  };

  const results: any[] = [];

  for (const scenario of profile.scenarios) {
    const scenarioStart = Date.now();
    const warnings: string[] = [];

    await runScenario(scenario, ctx);

    const samples = [];
    for (const collector of profile.collectors) {
      try {
        if (collector.setup) await collector.setup(ctx);
        samples.push(...(await collector.collect(ctx)));
      } catch (err) {
        warnings.push(`collector:${collector.id}:${String(err)}`);
      } finally {
        if (collector.teardown) await collector.teardown(ctx);
      }
    }

    results.push({
      scenarioId: scenario.id,
      durationMs: Date.now() - scenarioStart,
      samples,
      warnings,
    });
  }

  return {
    version: "r68",
    runId: ctx.runId,
    profile: ctx.profile,
    startedAt: ctx.startedAt,
    finishedAt: new Date().toISOString(),
    results,
  };
}

async function runScenario(scenario: ScenarioSpec, ctx: BenchContext) {
  for (let i = 0; i < scenario.warmupIterations; i++) {
    await scenario.execute(ctx);
  }
  for (let i = 0; i < scenario.measuredIterations; i++) {
    await scenario.execute(ctx);
  }
}
```

## 6) Profile CI (contracts + behavior)

```ts
// bench/profiles.ts
import type { ScenarioSpec, CollectorContract, BenchProfile } from "./collectors/base.contract";

type ProfileConfig = {
  seed: number;
  tags?: string[];
  scenarios: ScenarioSpec[];
  collectors: CollectorContract[];
};

const common = {
  seed: 42,
  tags: ["backend", "aurora"],
};

const profiles: Record<BenchProfile, ProfileConfig> = {
  smoke: {
    ...common,
    scenarios: [/* 1-2 szybkie scenariusze */],
    collectors: [/* latency */],
  },
  pr: {
    ...common,
    scenarios: [/* kluczowe scenariusze krytyczne */],
    collectors: [/* latency + throughput */],
  },
  nightly: {
    ...common,
    scenarios: [/* pelny zestaw */],
    collectors: [/* latency + throughput + resource */],
  },
};

export function loadProfile(name: BenchProfile): ProfileConfig {
  return profiles[name];
}
```

### SLA uruchomien

- `smoke`: <= 2 min, blokuje merge tylko przy twardej regresji krytycznej.
- `pr`: <= 8 min, blokuje merge przy regresji ponad threshold.
- `nightly`: pelny run, nie blokuje PR, tworzy trend i alerty.

## 7) Kontrakty collectorow (minimalne API)

### `latency.collector.ts`

- Zbiera `latency.p50_ms`, `latency.p95_ms`, `latency.p99_ms`.
- `better = "lower"`.

### `throughput.collector.ts`

- Zbiera `throughput.rps`.
- `better = "higher"`.

### `resource.collector.ts`

- Zbiera `resource.cpu_percent`, `resource.mem_bytes`.
- `better`: `cpu -> lower`, `mem -> lower`.

## 8) Proponowany JSON output (collector contract consumer)

```json
{
  "version": "r68",
  "runId": "1716550000000",
  "profile": "pr",
  "startedAt": "2026-05-24T08:10:00.000Z",
  "finishedAt": "2026-05-24T08:14:11.000Z",
  "results": [
    {
      "scenarioId": "http-latency",
      "durationMs": 55120,
      "samples": [
        { "key": "latency.p95_ms", "value": 92.1, "unit": "ms", "better": "lower" },
        { "key": "throughput.rps", "value": 811.4, "unit": "rps", "better": "higher" }
      ],
      "warnings": []
    }
  ]
}
```

## 9) Schema walidacji (skrot)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "BenchmarkResultR68",
  "type": "object",
  "required": ["version", "runId", "profile", "startedAt", "finishedAt", "results"],
  "properties": {
    "version": { "const": "r68" },
    "profile": { "enum": ["smoke", "pr", "nightly"] },
    "results": { "type": "array" }
  }
}
```

## 10) CI wiring (minimal)

```yaml
# .github/workflows/bench.yml (szkic)
name: bench
on:
  pull_request:
  schedule:
    - cron: "0 2 * * *"
jobs:
  bench-smoke:
    if: github.event_name == 'pull_request'
    steps:
      - run: node bench/cli.js --profile=smoke
  bench-pr:
    if: github.event_name == 'pull_request'
    steps:
      - run: node bench/cli.js --profile=pr
  bench-nightly:
    if: github.event_name == 'schedule'
    steps:
      - run: node bench/cli.js --profile=nightly
```

## 11) Regresja i progi (tanie utrzymanie)

- Trzymac progi w jednym miejscu: `bench.config.ts`.
- Porownanie do rolling baseline z `N=10` ostatnich runow.
- Alert tylko dla stabilnych regresji (np. 3 kolejne nightly).
- PR blocker tylko dla metryk krytycznych (`latency.p95_ms`, `throughput.rps`).

## 12) Checklista wdrozenia

1. Dodac `bench/` i kontrakty.
2. Podlaczyc 2 scenariusze smoke.
3. Podlaczyc collectory latency + throughput.
4. Dodac JSON reporter + upload artifact.
5. Wlaczyc `smoke` i `pr` w PR, `nightly` w cron.
6. Ustawic progi startowe i rewizje po 2 tygodniach.

---

Ten szkic jest celowo prosty i modularny: pozwala wejsc szybko na CI z benchmarkami, a potem rozszerzac tylko tam, gdzie jest realna wartosc.
