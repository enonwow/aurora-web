# Code Skeleton Source Resolver R68

Data: 2026-05-24
Status: Draft (technical implementation skeleton)
Zakres: resolver zrodel dla pipeline processing, z deterministycznym precedence, trace/provenance i testowalnymi seamami.

## 1. Cel i wymagania niefunkcyjne

Cel:
- Dostarczyc jeden, deterministyczny mechanizm wyboru zrodla zasobu (`winner`) dla parser/enrichment/apply.
- Zachowac zgodnosc z zasadami lane-bound (`ARE/GIT`) i globalnym priorytetem zrodel.
- Emitowac kompletna diagnostyke (`candidates`, `winner`, `reason`, `missCode`, `retryable`).

Wymagania niefunkcyjne:
- Determinizm: ten sam input + ten sam snapshot katalogow => ten sam wynik.
- Explainability: kazda decyzja ma trace i uzasadnienie policy.
- Isolation: brak cichych fallbackow poza policy matrix.
- Performance: O(n) po liczbie kandydatow dla danego lookupu, z lokalnymi cache L1/L2.

## 2. Precedence Matrix (source policy)

Global source rank (od najwyzszego):
1. `module_decompiled`
2. `module_packed`
3. `hak`
4. `vanilla`

Tabela policy per resource type:

| Resource type | Allowed sources | Forbidden sources | Tie-break | Final fallback | Failure mode |
|---|---|---|---|---|---|
| `ARE` | `module_decompiled`, `module_packed` | `hak`, `vanilla` | `module_decompiled` > `module_packed`; potem stable `moduleOrdinal`, `pathLex` | brak | hard-fail (`P0_SOURCE_MISSING`) |
| `GIT` | `module_decompiled`, `module_packed` | `hak`, `vanilla` | jak wyzej | brak | hard-fail (`P0_SOURCE_MISSING`) |
| `2DA` | wszystkie 4 | brak | global rank, potem `hakPriority`, `moduleOrdinal`, `pathLex` | `vanilla` | soft-fail gdy optional; hard-fail gdy required |
| `TLK` | `module_decompiled`, `module_packed`, `hak`, `vanilla` | brak | global rank + language pack preference + `pathLex` | `vanilla` | hard-fail dla required set |
| `UT*`/inne runtime assets | wszystkie 4 | brak | global rank + deterministic tie chain | `vanilla` | policy-driven (`required` vs `optional`) |

Uwagi:
- Dla `ARE/GIT` resolver jest lane-bound: lookup tylko w kontekscie modulu joba.
- `hak` nigdy nie moze byc winnerem dla `ARE/GIT`.
- `vanilla` moze byc winnerem tylko tam, gdzie policy typu na to pozwala.

## 3. Modulowy podzial implementacji

Proponowany modul: `backend/src/modules/processing/source-resolver`

Struktura:
- `domain/`
- `application/`
- `adapters/inbound/`
- `adapters/outbound/`
- `policies/`

Pliki (skeleton):
- `domain/source-resolution.types.ts`
- `domain/source-resolution.policy.ts`
- `domain/source-resolution.errors.ts`
- `domain/source-resolution.trace.ts`
- `application/source-resolver.service.ts`
- `application/resource-candidate-catalog.service.ts`
- `application/hak-priority-sorter.ts`
- `application/resolution-trace.builder.ts`
- `application/cache/source-resolver-l1.cache.ts`
- `application/cache/source-catalog-l2.cache.ts`
- `policies/are.policy.ts`
- `policies/git.policy.ts`
- `policies/two-da.policy.ts`
- `policies/tlk.policy.ts`
- `adapters/outbound/runtime-source-index.repository.ts`
- `adapters/outbound/module-content.repository.ts`
- `adapters/outbound/hak-content.repository.ts`
- `adapters/outbound/vanilla-content.repository.ts`
- `adapters/inbound/source-resolver.facade.ts`

## 4. Interfejsy (ports/contracts)

### 4.1 Wejscie resolvera

```ts
export interface ResolveSourceRequest {
  jobId: string;
  entityType: "area" | "creature" | "placeable" | "generic";
  resourceType: string; // ARE, GIT, 2DA, TLK, ...
  resourceName: string; // np. resref/file key
  lookupKey: string; // canonical key, np. lower(resref)+ext
  moduleContext?: {
    moduleId: string;
    moduleOrdinal: number;
    laneId: string;
  };
  required: boolean;
  locale?: string;
}
```

### 4.2 Wyjscie resolvera

```ts
export interface ResolveSourceResult {
  winner?: ResolvedCandidate;
  candidates: CandidateEvaluation[];
  diagnostics: {
    code?: string;
    message: string;
    retryable: boolean;
    required: boolean;
  };
  provenance: {
    sourceType?: "module_decompiled" | "module_packed" | "hak" | "vanilla";
    sourceId?: string;
    laneId?: string;
    policyId: string;
    policyVersion: string;
  };
}
```

### 4.3 Porty domenowe

```ts
export interface SourceResolverPort {
  resolve(req: ResolveSourceRequest): Promise<ResolveSourceResult>;
}

export interface CandidateCatalogPort {
  listCandidates(req: ResolveSourceRequest): Promise<ResourceCandidate[]>;
}

export interface SourcePolicyPort {
  evaluate(req: ResolveSourceRequest, candidates: ResourceCandidate[]): PolicyDecision;
}

export interface ResolutionTracePort {
  build(req: ResolveSourceRequest, decision: PolicyDecision): ResolutionTrace;
}
```

### 4.4 Porty infrastrukturalne

```ts
export interface RuntimeSourceIndexRepository {
  getSnapshotKey(): Promise<string>; // revision fingerprint
  findModuleCandidates(lookupKey: string, laneId: string): Promise<ResourceCandidate[]>;
  findHakCandidates(lookupKey: string): Promise<ResourceCandidate[]>;
  findVanillaCandidates(lookupKey: string): Promise<ResourceCandidate[]>;
}

export interface PolicyRegistry {
  getPolicy(resourceType: string): SourcePolicyPort;
}
```

## 5. Przeplyw wykonania (orchestrator)

`SourceResolverService.resolve()`:
1. Canonicalize request (`lookupKey`, `resourceType`, lane metadata).
2. Odczytaj policy z `PolicyRegistry`.
3. Pobierz kandydatow przez `CandidateCatalogPort` (z cache boundaries).
4. Odfiltruj kandydatow zabronionych przez policy.
5. Zastosuj deterministic ranking + tie-break.
6. Zbuduj `ResolveSourceResult` + trace/provenance.
7. Przy braku winnera:
- `required=true` => hard-fail code (`P0_SOURCE_MISSING` lub typ-specyficzny),
- `required=false` => soft-miss code (`P1_SOURCE_OPTIONAL_MISSING`).

Pseudo:

```ts
const policy = policyRegistry.getPolicy(req.resourceType);
const candidates = await catalog.listCandidates(req);
const decision = policy.evaluate(req, candidates);
return traceBuilder.buildResult(req, decision);
```

## 6. Cache boundaries

### 6.1 L1 cache (request-scope, in-memory, ephemeral)

Granica:
- Zyje tylko w ramach jednego requestu/job-stepu.
- Klucz: `policyId + lookupKey + laneId + locale + required`.

Cel:
- Eliminacja wielokrotnego liczenia tego samego lookupu podczas jednego przebiegu parsera/enricher.

Invalidation:
- Automatyczna przez koniec requestu (brak shared state).

Ryzyko:
- Niskie; brak stale-read miedzy jobami.

### 6.2 L2 cache (snapshot-scope, shared per worker)

Granica:
- Shared cache dla katalogu kandydatow, ale scisle revision-bound.
- Klucz: `snapshotKey + lookupKey + laneId`.
- `snapshotKey` musi zawierac co najmniej:
  - runtime settings revision,
  - module index revision,
  - hak manifest revision,
  - vanilla catalog revision.

Cel:
- Ograniczenie I/O przy powtarzalnych lookupach miedzy jobami.

Invalidation:
- Tylko przez zmiane `snapshotKey` (write-on-new-revision).
- Brak recznego partial purge; unikamy niespojnych okien.

Ryzyko:
- Srednie; bledny `snapshotKey` => stale candidate set.

### 6.3 Poza zakresem cache

Nie cache'ujemy:
- Ostatecznego winnera miedzy roznymi `required/optional` kontraktami bez klucza policy.
- Diagnostyki z bledow transient I/O.
- Wynikow przy partial failure storage (musza byc ponowione).

## 7. Test seams i strategia testowa

### 7.1 Unit seams (domain/application)

Mockowane porty:
- `CandidateCatalogPort`
- `PolicyRegistry`
- `ResolutionTracePort`

Scenariusze krytyczne:
- `ARE/GIT` blokuje `hak/vanilla` nawet gdy jedyne dostepne.
- `module_decompiled` wygrywa z `module_packed`.
- Deterministyczny tie-break dla remisow (staly winner).
- `required=true` bez winnera -> hard-fail code.
- `required=false` bez winnera -> soft-miss code.

### 7.2 Policy tests (per resource type)

`are.policy.spec.ts`, `git.policy.spec.ts`, `two-da.policy.spec.ts`, `tlk.policy.spec.ts`:
- matrix-driven tests (`table tests`) dla allowed/forbidden/fallback.
- regression cases dla lane leakage (`ARE/GIT`).
- locale-aware selection dla TLK.

### 7.3 Integration seams (adapter + cache boundaries)

Testy integracyjne:
- `source-catalog.integration.spec.ts`
- `source-resolver-cache.integration.spec.ts`

Assercje:
- L1 cache deduplikuje lookup w ramach requestu.
- L2 cache trafia tylko gdy `snapshotKey` identyczny.
- Zmiana `snapshotKey` powoduje naturalny miss i repopulacje.

### 7.4 Contract seams (API/status payload)

`source-diagnostics.contract.spec.ts`:
- stabilnosc pol: `entityType/resourceName/lookupKey/sourceProvenance`.
- stabilnosc `code/http/retryable` dla miss/error.
- brak breaking change bez bump policyVersion.

## 8. Error taxonomy (minimum)

Proponowane kody:
- `P0_SOURCE_MISSING` (required asset unresolved)
- `P0_SOURCE_FORBIDDEN_BY_POLICY` (candidate exists but forbidden)
- `P1_SOURCE_OPTIONAL_MISSING` (optional miss)
- `P1_SOURCE_AMBIGUOUS_TIE` (tie nierozstrzygalny przez deterministic chain; traktowane jako defect danych)
- `P1_SOURCE_INDEX_UNAVAILABLE` (source catalog transient failure)

Kazdy blad zawiera:
- `resourceType`, `resourceName`, `lookupKey`, `laneId`, `policyId`, `policyVersion`, `candidateCount`.

## 9. Minimalny plan wdrozenia (incremental)

1. Skeleton domeny + interfejsy + policy registry.
2. `ARE/GIT` policy + unit tests (blokada lane leakage).
3. `2DA/TLK` policy + matrix tests.
4. `ResourceCandidateCatalogService` + outbound repositories.
5. L1/L2 cache boundaries + integration tests.
6. Diagnostics contract + API payload wiring.

## 10. Otwarte decyzje implementacyjne

- Czy `snapshotKey` skladac jako hash concat revisionow (`sha256`) czy jawny tuple string.
- Czy L2 cache trzymac per-process (Map/LRU) czy przez zewnetrzny cache adapter.
- Czy `P1_SOURCE_AMBIGUOUS_TIE` ma byc soft-fail czy hard-fail dla selected resource classes.

## 11. Definition of Done (dla modu³u source-resolver)

- Wszystkie policy matrix cases pokryte testami tabelarycznymi.
- Determinizm potwierdzony testami wielokrotnego uruchomienia (repeatability).
- L1/L2 cache boundary tests zielone, z testem invalidation przez `snapshotKey`.
- Contract tests potwierdzaja stabilnosc diagnostyki/provenance.
- Brak cichych fallbackow i brak lane leakage dla `ARE/GIT`.
