# Aurora Reverse Backend - Implementation Backlog R64

Cel: skondensowany backlog implementacyjny backendu (max 12 zadan), ulozony pod decompilation flows i oparty o wszystkie specy R63.

## Kolejnosc realizacji

1. Runtime source gate + path security hardening
Zakres: `admin-runtime-settings-contract`, `module-source-priority`, `path-security-hardening`.
Definition of Done:
- `PUT/GET /api/v1/settings/runtime` egzekwuje walidacje source gate (decompiled vs packed) i path policy (allowlisted roots, traversal/symlink/toctou guard).
- Bootstrap fail-fast dziala dla blednych konfiguracji i nie robi silent fallback.
- Endpoint `haks/resolved` zwraca deterministyczne, canonicalne sciezki zgodne z policy.

2. Deterministyczny resolver zrodel + HAK + 2DA/TLK provenance
Zakres: `hak-resolution`, `source-lists-2da-tlk`.
Definition of Done:
- Resolver implementuje stale precedence: `module_decompiled -> module_packed -> hak -> vanilla`.
- Dla kazdego lookupu emitowane sa provenance fields (`winner layer`, `hakPriorityEffective/source`, source path/archive).
- Rozroznione sa hard-fail vs preserve-first miss (P0 vs P1/P2) z kodami diagnostycznymi.

3. Processing foundation (hex ports + shared stores)
Zakres: `hex-processing-ports`, czesciowo `blob-ingest-pipeline`.
Definition of Done:
- Istnieje modul `processing/shared` z portami: job, checkpoint, lock, telemetry, events, clock.
- Use case orchestration dzieli stage boundaries: `ingest -> parser -> enrichment -> publish`.
- Storage joba/checkpointu wspiera resume po restarcie i lease takeover.

4. Decompiler adapter i kontrakt procesu CLI
Zakres: `decompiler-integration`, `processing-error-taxonomy`.
Definition of Done:
- Adapter `DecompilerPort` realizuje kontrakt request/response, timeout, graceful-stop + force-kill.
- Exit codes mapowane 1:1 na canonical `PIPELINE_DECOMP_*` + retryable semantics.
- Stdout/stderr capture ma tail limits, correlation fields i trafia do diagnostyki runu.

5. Blob ingest CAS pipeline (staging -> sync -> commit -> latest)
Zakres: `blob-ingest-pipeline`, `module-source-priority`.
Definition of Done:
- `job_key`, `blob_key`, `commit_key` i layout bucketu (`cas/`, `commits/`, `refs/`) sa wdrozone.
- Checkpoint-driven resume dziala dla restartu na kazdym kroku 1..6 bez duplikacji blobow.
- Revision gate dla `refs/.../latest` wykrywa konflikt deterministycznie i nie nadpisuje obcego commitu.

6. Job lifecycle + idempotencja + retry/cancel
Zakres: `processing-job-lifecycle`, `processing-api-shape`, `processing-error-taxonomy`.
Definition of Done:
- Statusy i przejscia state machine sa atomowe (CAS), z oddzieleniem `status` i `phase`.
- Retry dziala tylko dla `retryable=true` i ma limity/backoff zgodne ze spec.
- Cancel/retry endpoints sa idempotentne i raportuja `cancelRequested/cancelHonored`.

7. Publiczny Processing API i authz/authn policy
Zakres: `processing-api-shape`, `access-partition-rules`.
Definition of Done:
- Dostepne sa endpointy start/list/status/preview/apply/cancel-delete dla `placeable|creature|area`.
- Wymagane trasy mutujace egzekwuja `Idempotency-Key`, `expectedRevision` i canonical error envelope.
- Filtracja read-path (ownership/visibility/securityLabel) nie ujawnia rekordow poza partycja.

8. Parse + validation lanes dla area/door/trigger
Zakres: `area-composition`, `are-git-validation`, `door-transition`.
Definition of Done:
- Parse ARE/GIT realizuje lanes z preserve-first i policy `strict|warn|audit`.
- Walidator pokrywa required fields, cardinality, cross-resource refs, alias policy i numeric diagnostics.
- DTO przejsc door/trigger zachowuje raw fields/aliases, bez utraty danych preserve-only.

9. Enrichment i contracts domenowe (placeable/creature/preview)
Zakres: `placeable-classification`, `creature-enrichment`, `preview-metadata-contract`.
Definition of Done:
- Placeable lane zwraca klasyfikacje `placeable|door|vfx` z evidence i token diagnostics.
- Creature lane realizuje overlay `UTC -> GIT`, lookup `2DA/TLK/HAK` i validation issues.
- Preview metadata dla `placeable|creature|area` jest backend-authoritative (`previewAllowed`, `editSafe`, `topIssues`).

10. Identity, revision-gated apply i cache strategy
Zakres: `asset-id-strategy`, `asset-cache-strategy`.
Definition of Done:
- Generowane sa deterministycznie: `areaInstanceId`, `instanceId`, `instanceAddressId`, `instanceRevisionId`, `areaRevision`.
- Apply/write path dziala na `instanceAddressId + expectedRevision` i zwraca typed write outcome.
- L1/L2 cache keys, invalidation i linkage do CAS blob sa zgodne z lineage/policy/process version.

11. Observability taxonomy i SLO instrumentation
Zakres: `observability-event-taxonomy` + binding do lifecycle/error specs.
Definition of Done:
- Emitowane sa wymagane event families (`job`, `stage`, `retry`, `lock`, `determinism`, `revision_gate`).
- Metryki/countery/histogramy maja niska kardynalnosc i wymagane labels/stage mapping.
- Dashboard compatibility z legacy R15 jest zachowana przez `legacyStage` window.

12. Performance gates, operacje i rollout governance
Zakres: `benchmark-plan`, `benchmark-harness-contract`, `ops-runbook-module-refresh`, `schema-evolution-rules`.
Definition of Done:
- Benchmark harness uruchamia scenariusze PL/CR/AR, produkuje `benchmark-report.json`, `benchmark-events.jsonl`, `benchmark-summary.md`.
- Release gate ma progi PASS/REGRESSION i porownanie run-to-run po `datasetFingerprint`.
- Runbook module refresh (pre-flight, rollback, verification) jest wykonywalny end-to-end.
- Rollout kontraktow DTO/API ma flagi migracyjne, okna deprecacji i testy compatibility-forward.

## Uwagi wykonawcze

- Kolejnosc 1->12 jest celowa: najpierw safety + source determinism, potem orchestration/decompile, nastepnie API/domain contracts, na koncu observability i release gates.
- Backlog jest scoped pod decompilation flows; elementy spoza tego flow (np. pelne UI) pozostaja poza zakresem.
