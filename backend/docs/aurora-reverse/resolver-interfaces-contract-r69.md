# Resolver Interfaces Contract (R69, Agent B7)

Data: 2026-05-24  
Status: Draft (ports/adapters contract)  
Zakres: kontrakt interfejsow resolvera zrodel dla processing pipeline (`ARE/GIT/2DA/TLK/UT*`), z sygnaturami operacji, modelem bledow, retry semantics i planem testow kontraktowych.

## 1. Cel

Kontrakt ustala stabilny boundary miedzy:
1. Adapterami inbound (use-cases i HTTP/worker entrypoint),
2. Rdzeniem resolvera (application/domain),
3. Adapterami outbound (katalog zrodel, odczyt contentu, telemetry/policy registry).

Cele:
1. Deterministyczny wynik dla tego samego inputu i snapshotu danych.
2. Jednoznaczny model bledu (`code`, `retryable`, `category`).
3. Jawne zasady ponowien tylko dla bledow transient.
4. Powtarzalny zestaw testow kontraktowych dla provider/consumer.

## 2. Granice architektoniczne

## 2.1 Inbound adapters (consumer of core)

- `ProcessingStageResolverAdapter` (uzywany przez parser/enrichment stages)
- `ProcessingApiResolverAdapter` (uzywany przez endpointy diagnostyczne/debug)

Inbound adapter wywoluje tylko `SourceResolverPort`.

## 2.2 Core (application/domain)

- `SourceResolverService` (orchestrator)
- `PolicyEngine` (resource-type specific policy)
- `TraceBuilder` (explainability payload)

Core konsumuje tylko porty outbound; nie zna technologii storage.

## 2.3 Outbound adapters (provider for core)

- `CatalogIndexAdapter` (module/hak/vanilla candidate index)
- `SourceBlobReadAdapter` (opcjonalny eager verify read)
- `PolicyRegistryAdapter` (policy map + wersjonowanie)
- `ResolverTelemetryAdapter` (metryki/eventy)

## 3. Kontrakt typow i sygnatur (TypeScript)

```ts
export type ResourceType = "ARE" | "GIT" | "2DA" | "TLK" | "UTC" | "UTP" | "OTHER";
export type SourceLayer = "module_decompiled" | "module_packed" | "hak" | "vanilla";

export interface ResolveSourceRequest {
  requestId: string;
  jobId: string;
  resourceType: ResourceType;
  resourceName: string;
  lookupKey: string;
  required: boolean;
  locale?: string;
  moduleContext?: {
    moduleId: string;
    moduleOrdinal: number;
    laneId: string;
  };
  options?: {
    includeTrace?: boolean; // default true
    verifyReadableWinner?: boolean; // default false
    deadlineMs?: number; // per resolve budget
  };
}

export interface ResolveManyRequest {
  requestId: string;
  jobId: string;
  items: ResolveSourceRequest[];
  failFast?: boolean; // default false
}

export interface ResourceCandidate {
  candidateId: string;
  lookupKey: string;
  resourceType: ResourceType;
  sourceLayer: SourceLayer;
  sourceId: string;
  originPath: string;
  moduleOrdinal?: number;
  hakPriorityEffective?: number;
  catalogOrder: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ResolutionDiagnostics {
  code: ResolverErrorCode;
  message: string;
  retryable: boolean;
  category: ResolverErrorCategory;
  details?: Array<{ path: string; reason: string }>;
}

export interface ResolveSourceResult {
  resolved: boolean;
  winner?: ResourceCandidate;
  diagnostics?: ResolutionDiagnostics;
  candidatesEvaluated: number;
  policy: { id: string; version: string };
  trace?: ResolutionTrace;
}

export interface ResolveManyResult {
  results: ResolveSourceResult[];
  summary: {
    total: number;
    resolved: number;
    unresolved: number;
    hardFailures: number;
  };
}

export interface ResolutionTrace {
  traceId: string;
  rankingChain: Array<{
    candidateId: string;
    sourceLayer: SourceLayer;
    accepted: boolean;
    rule: string;
    reason: string;
  }>;
  winnerCandidateId?: string;
}
```

### 3.1 Porty inbound -> core

```ts
export interface SourceResolverPort {
  resolve(request: ResolveSourceRequest, ctx?: ResolveContext): Promise<ResolveSourceResult>;
  resolveMany(request: ResolveManyRequest, ctx?: ResolveContext): Promise<ResolveManyResult>;
}

export interface ResolveContext {
  nowIso: string;
  correlationId: string;
  attempt: number;
}
```

### 3.2 Porty core -> outbound

```ts
export interface CandidateCatalogPort {
  listCandidates(input: {
    lookupKey: string;
    resourceType: ResourceType;
    laneId?: string;
    locale?: string;
    snapshotKey: string;
  }): Promise<ResourceCandidate[]>;
}

export interface SnapshotVersionPort {
  getSnapshotKey(): Promise<string>;
}

export interface SourceContentPort {
  verifyReadable(candidate: ResourceCandidate): Promise<{ readable: boolean; sizeBytes?: number }>;
}

export interface PolicyRegistryPort {
  get(resourceType: ResourceType): Promise<SourcePolicyContract>;
}

export interface SourcePolicyContract {
  id: string;
  version: string;
  evaluate(input: {
    request: ResolveSourceRequest;
    candidates: ResourceCandidate[];
  }): PolicyDecision;
}

export interface PolicyDecision {
  winner?: ResourceCandidate;
  diagnostics?: ResolutionDiagnostics;
  rankingTrace: ResolutionTrace["rankingChain"];
}

export interface ResolverTelemetryPort {
  emitResolveCompleted(event: {
    requestId: string;
    jobId: string;
    resourceType: ResourceType;
    resolved: boolean;
    winnerLayer?: SourceLayer;
    errorCode?: ResolverErrorCode;
    durationMs: number;
  }): Promise<void>;
}
```

## 4. Semantyka operacji

## 4.1 `resolve(...)`

1. Core pobiera `snapshotKey`.
2. Core pobiera policy przez `PolicyRegistryPort`.
3. Core pobiera kandydatow przez `CandidateCatalogPort`.
4. Policy wybiera winnera lub zwraca miss/failure.
5. Jesli `verifyReadableWinner=true`, core wywoluje `SourceContentPort.verifyReadable`.
6. Core zwraca `ResolveSourceResult` i emituje telemetry.

Gwarancje:
1. Operacja jest read-only i idempotentna.
2. Ten sam `request + snapshotKey + policyVersion` daje ten sam winner i trace order.
3. Brak cichych fallbackow poza policy.

## 4.2 `resolveMany(...)`

1. Dla kazdego elementu uruchamiane jest `resolve(...)`.
2. `failFast=false` oznacza best-effort i agregacje wynikow.
3. `failFast=true` zatrzymuje po pierwszym hard-failure.

## 5. Error model

## 5.1 Error envelope (domain/internal)

```ts
export type ResolverErrorCategory =
  | "VALIDATION"
  | "POLICY"
  | "NOT_FOUND"
  | "DEPENDENCY"
  | "TIMEOUT"
  | "INTERNAL";

export type ResolverErrorCode =
  | "SOURCE_REQUEST_INVALID"
  | "SOURCE_POLICY_BLOCKED"
  | "SOURCE_REQUIRED_MISSING"
  | "SOURCE_OPTIONAL_MISSING"
  | "SOURCE_CANDIDATE_UNREADABLE"
  | "SOURCE_CATALOG_UNAVAILABLE"
  | "SOURCE_POLICY_UNAVAILABLE"
  | "SOURCE_DEPENDENCY_TIMEOUT"
  | "SOURCE_RESOLUTION_INTERNAL";

export interface ResolverError {
  code: ResolverErrorCode;
  message: string;
  category: ResolverErrorCategory;
  retryable: boolean;
  httpStatus: 400 | 404 | 409 | 422 | 500 | 503 | 504;
  details?: Array<{ path: string; reason: string }>;
  cause?: unknown;
}
```

## 5.2 Canonical mapping

| Code | Category | HTTP | retryable | Kiedy |
|---|---|---:|---:|---|
| `SOURCE_REQUEST_INVALID` | `VALIDATION` | 422 | false | Zly `lookupKey`, brak `laneId` dla `ARE/GIT`, niespojny payload. |
| `SOURCE_POLICY_BLOCKED` | `POLICY` | 409 | false | Kandydaci istnieja tylko w warstwach zabronionych przez policy. |
| `SOURCE_REQUIRED_MISSING` | `NOT_FOUND` | 404 | false | `required=true` i brak dopuszczalnego winnera. |
| `SOURCE_OPTIONAL_MISSING` | `NOT_FOUND` | 404 | false | `required=false`, brak winnera (soft miss). |
| `SOURCE_CANDIDATE_UNREADABLE` | `DEPENDENCY` | 503 | true | Winner wskazany, ale read verify transiently nieudany. |
| `SOURCE_CATALOG_UNAVAILABLE` | `DEPENDENCY` | 503 | true | Catalog/index nieosiagalny. |
| `SOURCE_POLICY_UNAVAILABLE` | `DEPENDENCY` | 503 | true | Registry policy niedostepne chwilowo. |
| `SOURCE_DEPENDENCY_TIMEOUT` | `TIMEOUT` | 504 | true | Timeout na `snapshot/catalog/policy/verifyReadable`. |
| `SOURCE_RESOLUTION_INTERNAL` | `INTERNAL` | 500 | false | Niesklasyfikowany blad aplikacji. |

Normy:
1. `retryable=true` tylko dla przypadkow transient (`DEPENDENCY`, `TIMEOUT`).
2. `POLICY/VALIDATION/NOT_FOUND` sa no-retry.
3. `SOURCE_OPTIONAL_MISSING` nie jest hard-failure dla flow optional.

## 6. Retry semantics

## 6.1 Zasady globalne

1. Retry tylko dla bledow z `retryable=true`.
2. Retry nigdy nie zmienia request payload ani policy.
3. Retry musi respektowac `deadlineMs` z requestu.
4. Po wyczerpaniu budzetu zwracany jest ostatni blad retryable bez konwersji na 500.

## 6.2 Budzet i backoff (default)

1. `maxAttempts = 3` (1 + 2 ponowienia).
2. `baseDelayMs = 150`, exponential `delay = baseDelayMs * 2^(attempt-1)`.
3. `jitterMs = random(0..100)`.
4. `maxDelayMs = 2000`.

## 6.3 Retry policy per operacja outbound

| Operacja | Retry | Uwagi |
|---|---|---|
| `SnapshotVersionPort.getSnapshotKey` | tak | timeout/dependency only |
| `PolicyRegistryPort.get` | tak | timeout/unavailable only |
| `CandidateCatalogPort.listCandidates` | tak | timeout/unavailable only |
| `SourceContentPort.verifyReadable` | tak | tylko gdy `verifyReadableWinner=true` |
| `SourcePolicyContract.evaluate` | nie | czysto deterministyczna funkcja domenowa |
| `ResolverTelemetryPort.emitResolveCompleted` | nie-blokujace | blad telemetry nie moze psuc wyniku resolve |

## 6.4 Klasyfikacja no-retry

No-retry wymagane dla:
1. `SOURCE_REQUEST_INVALID`
2. `SOURCE_POLICY_BLOCKED`
3. `SOURCE_REQUIRED_MISSING`
4. `SOURCE_OPTIONAL_MISSING`
5. `SOURCE_RESOLUTION_INTERNAL` (chyba ze upstream jawnie opakowal jako timeout/dependency)

## 7. Contract tests path i plan egzekucji

## 7.1 Sciezka testow

- `backend/test/contract/source-resolver/source-resolver.port.contract.spec.ts`
- `backend/test/contract/source-resolver/candidate-catalog.provider.contract.spec.ts`
- `backend/test/contract/source-resolver/policy-registry.provider.contract.spec.ts`
- `backend/test/contract/source-resolver/source-content.provider.contract.spec.ts`
- `backend/test/contract/source-resolver/fixtures/*.json`

## 7.2 Zakres testow kontraktowych

1. `SourceResolverPort`:
- deterministyczny winner i trace order dla identycznego snapshotu,
- poprawny miss contract (`SOURCE_REQUIRED_MISSING` vs `SOURCE_OPTIONAL_MISSING`),
- `resolveMany` summary oraz `failFast` semantics.

2. `CandidateCatalogPort` provider:
- zwraca tylko kandydatow z requested `snapshotKey`,
- stabilny `catalogOrder`,
- klasyfikuje outage jako `SOURCE_CATALOG_UNAVAILABLE` lub timeout.

3. `PolicyRegistryPort` provider:
- zawsze zwraca policy z `id` i `version`,
- brak policy dla typu mapuje sie na `SOURCE_POLICY_UNAVAILABLE`.

4. `SourceContentPort` provider:
- `verifyReadable` kontrakt: `readable=false` nie rzuca wyjatku przy deterministic no-content,
- transient I/O rzuca blad mapowany na retryable dependency/timeout.

## 7.3 Minimalna macierz scenariuszy

| ID | Scenariusz | Oczekiwane |
|---|---|---|
| CT-01 | `ARE` kandydat tylko `hak` | `SOURCE_POLICY_BLOCKED`, `retryable=false` |
| CT-02 | `ARE` kandydat `module_packed` i `module_decompiled` | winner `module_decompiled` |
| CT-03 | `UTC` kandydat `module_packed` i `hak` | winner `module_packed` |
| CT-04 | `2DA` brak wszedzie, `required=false` | `SOURCE_OPTIONAL_MISSING` |
| CT-05 | `2DA` brak wszedzie, `required=true` | `SOURCE_REQUIRED_MISSING` |
| CT-06 | catalog timeout 2x, success na 3 | final success, telemetry z attempts=3 |
| CT-07 | catalog timeout 3x | `SOURCE_DEPENDENCY_TIMEOUT`, `retryable=true` |
| CT-08 | policy evaluate deterministic tie | ten sam winner i ranking chain w 10 powtorzeniach |
| CT-09 | `verifyReadableWinner=true`, transient read failure | retry i final error `SOURCE_CANDIDATE_UNREADABLE` jesli exhausted |
| CT-10 | `resolveMany` z `failFast=true` | zatrzymanie po pierwszym hard-failure |

## 7.4 Gate CI

1. Kontrakt provider/consumer musi przechodzic na kazdym PR dotykajacym:
- `backend/src/modules/processing/source-resolver/**`
- `backend/src/modules/processing/**/adapters/outbound/**`

2. Wymagane uruchomienie:
- `npm run test:contract -- source-resolver`

3. Regresja kontraktu:
- zmiana sygnatur lub error mapping wymaga aktualizacji R69 i fixtures.

## 8. Niezmienniki kontraktu

1. Resolver jest side-effect free (poza telemetry best-effort).
2. `retryable` nie zalezy od strict/warn business mode, tylko od natury bledu.
3. `policy.id` i `policy.version` zawsze obecne w wyniku.
4. Dla `ARE/GIT` wymagany lane-bound context (`moduleContext.laneId`).
5. Brak winnera nigdy nie zwraca pustego bledu; zawsze canonical `SOURCE_*` code.
