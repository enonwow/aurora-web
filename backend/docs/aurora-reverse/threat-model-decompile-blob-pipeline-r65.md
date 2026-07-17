# Threat Model STRIDE: Decompile+Blob Pipeline R65 (Agent F3)

Data: 2026-05-24
Status: Draft (security threat model)
Zakres: pipeline `module path -> decompile -> staging -> blob ingest -> API exposure` dla Aurora Reverse.

## 1. Scope i cele

Ten dokument modeluje zagrozenia STRIDE i kontrole bezpieczenstwa dla pipeline, opierajac sie na:
1. `path-security-hardening-spec-r63.md`
2. `module-source-priority-spec-r63.md`
3. `decompiler-integration-spec-r63.md`
4. `blob-ingest-pipeline-spec-r63.md`
5. `processing-api-shape-spec-r63.md`
6. `processing-job-lifecycle-spec-r63.md`
7. `processing-error-taxonomy-spec-r63.md`
8. `observability-event-taxonomy-spec-r63.md`
9. `schema-evolution-rules-spec-r63.md`
10. `decision-test-gate-standard-r64.md`
11. `decision-command-conventions-r64.md`

Cele security:
1. Zapobiec spoofing/tampering na granicach: path config, decompiler process, blob CAS, API.
2. Zapewnic audytowalnosc i non-repudiation dla zmian path/runtime i operacji job lifecycle.
3. Ograniczyc wyciek danych (pathy, sekrety, metadane wewnetrzne).
4. Utrzymac odpornosc na DoS (timeouty, retry bounds, rate limits, lock conflicts).
5. Egzekwowac least privilege (RBAC, permission split, host FS ACL).

Poza zakresem:
1. Szczegolowy hardening UI.
2. Fizyczne zabezpieczenia hosta i sieci poza wymaganiami ACL/secret hygiene.

## 2. Pipeline i granice zaufania

## 2.1 Etapy
1. `module path`: runtime settings (`moduleDecompiledPath`, `modulePackedPath`, `hakDirectoryPath`, HAK entries).
2. `decompile`: backend uruchamia zewnetrzny CLI i odbiera artefakty.
3. `staging`: obliczenie hashy, budowa stage manifest, sync plan.
4. `blob ingest`: upload CAS blobs, immutable commit, update mutable `refs/<dataset>/latest.json` przez revision gate.
5. `API exposure`: start/status/preview/apply/cancel/retry endpoints.

## 2.2 Trust boundaries
1. `TB1`: Caller/Admin -> HTTP API (AuthN/AuthZ boundary).
2. `TB2`: API -> Runtime settings + local filesystem paths.
3. `TB3`: Backend process -> external decompiler process.
4. `TB4`: Staging workspace -> object storage (SeaweedFS S3).
5. `TB5`: Worker state machine -> DB checkpoints/lease/idempotency store.
6. `TB6`: Internal job/result data -> public API envelopes.

## 2.3 Assets krytyczne
1. `A1` Runtime path config i path security policy.
2. `A2` Input module files i decompiled artifacts.
3. `A3` Stage manifest + `stage_manifest_hash` + provenance.
4. `A4` CAS blobs, commit objects, `latest` ref revision.
5. `A5` Job identity (`jobId`, `jobKey`, `Idempotency-Key`), lease metadata.
6. `A6` Auth tokens, role/permission claims.
7. `A7` Telemetry/audit trail (`requestId`, events, diagnostics, error codes).
8. `A8` Blob storage credentials i runtime secrets.

## 3. STRIDE matrix (threats -> controls -> tests)

## 3.1 Spoofing

| ID | Stage | Scenariusz | Impact | Kontrole | Testy bezpieczenstwa |
|---|---|---|---|---|---|
| S-01 | module path / API | Atakujacy podszywa sie pod admina i zmienia high-risk path config. | Nieautoryzowany odczyt danych poza rootami, pivot do dalszych etapow. | Bearer Auth + RBAC (`FORBIDDEN_ROLE`, `FORBIDDEN_PERMISSION`), dodatkowy gate `admin.runtime_paths.write`, event `runtime_paths_changed` z `updatedBy`. | `SEC-S-01`: brak tokenu -> `401`; `SEC-S-02`: rola bez uprawnienia -> `403`; `SEC-S-03`: tylko dedykowana permission moze zmienic pola path. |
| S-02 | blob ingest | Worker spoofuje lease owner i przejmuje cudzy job. | Utrata integralnosci statusu/job flow, race na commit/latest. | CAS acquire lease, heartbeat TTL, `lease_owner`/`lease_expires_at`, conflict events (`pipeline.source_lock.conflict`). | `SEC-S-04`: dwa workery rownoczesnie startuja ten sam job, tylko jeden dostaje lease; `SEC-S-05`: wygasniety lease -> kontrolowany takeover bez podwojnego publish. |

## 3.2 Tampering

| ID | Stage | Scenariusz | Impact | Kontrole | Testy bezpieczenstwa |
|---|---|---|---|---|---|
| T-01 | module path | Path traversal/absolute escape/symlink abuse (`..`, UNC, junction) omija dozwolone rooty. | Nieautoryzowany odczyt plikow hosta. | Canonicalize (`resolve` + `realpath`), allowlist roots, deny traversal, `symlinkPolicy=deny` (lub strict `allow_inside_root`), fail-fast 422/startup-fatal. | `SEC-T-01`: `../` w HAK entry -> `RUNTIME_PATH_TRAVERSAL_DETECTED`; `SEC-T-02`: absolute poza root -> `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`; `SEC-T-03`: symlink/junction escape -> reject. |
| T-02 | decompile -> staging | Manipulacja artefaktami po dekompilacji, przed manifest/hash. | Nieprawidlowe dane trafia do CAS/API. | Isolated `outputDir` per `jobId/attempt`, artifacts path musi byc relatywny, obliczanie `sha256` + size + provenance przed sync plan. | `SEC-T-04`: podmiana pliku miedzy decompile i manifest -> hash mismatch, job fail non-retryable; `SEC-T-05`: path artifactu absolutny/escape -> reject. |
| T-03 | blob ingest | Tamper na blob/commit/latest pointer (stale write lub overwrite). | Cicha podmiana snapshotu, utrata determinism. | Immutable `cas/*` i `commits/*`, CAS key = `sha256(bytes)`, `latest` update przez `expected_revision` gate, conflict handling (`failed_conflict`). | `SEC-T-06`: stale `expected_revision` -> konflikt 409/fail_conflict; `SEC-T-07`: probny overwrite istniejacego commit key -> blokada/wykrycie. |

## 3.3 Repudiation

| ID | Stage | Scenariusz | Impact | Kontrole | Testy bezpieczenstwa |
|---|---|---|---|---|---|
| R-01 | module path | Admin zaprzecza, ze zmienil sciezki runtime. | Brak rozliczalnosci zmian high-risk. | Audit event `runtime_paths_changed` (updatedBy, revision, changed_fields), request correlation `x-request-id`. | `SEC-R-01`: kazda zmiana path ma pelny audit record; `SEC-R-02`: brak mozliwosci zapisu bez `updatedBy`. |
| R-02 | lifecycle/API | Operator zaprzecza cancel/retry/rebase akcji. | Trudny incident response, brak forensics. | Required lifecycle events: `pipeline.job.cancel_requested`, `pipeline.retry.scheduled/exhausted`, `pipeline.job.failed/completed*`. | `SEC-R-03`: cancel/retry emituja wymagane eventy z `jobId/jobKey/attempt`; `SEC-R-04`: event sequence zgodny ze state machine. |

## 3.4 Information Disclosure

| ID | Stage | Scenariusz | Impact | Kontrole | Testy bezpieczenstwa |
|---|---|---|---|---|---|
| I-01 | decompile/logging/observability | Wyciek pathow lub sekretow przez `details`, log tails, labels. | Ujawnienie topologii hosta i credentials. | Log hygiene: redaction sekretow, ograniczone tails (`4 MiB` ring), zakazane high-cardinality labels (`sourcePath`, raw details, tokeny). | `SEC-I-01`: skan logow/eventow pod token/pelne sekrety/path secrets; `SEC-I-02`: metryki nie zawieraja zakazanych labels. |
| I-02 | API exposure | Nieautoryzowany odczyt status/preview/result. | Wyciek danych pipeline i diagnostyki. | Endpoint RBAC/permissions (`scene.read`, `asset.preview`), standard `401/403`, envelope bez danych przy deny. | `SEC-I-03`: cross-role access matrix test dla GET status/preview; `SEC-I-04`: `PIPELINE_JOB_NOT_FOUND` bez ujawniania cudzych danych. |

## 3.5 Denial of Service

| ID | Stage | Scenariusz | Impact | Kontrole | Testy bezpieczenstwa |
|---|---|---|---|---|---|
| D-01 | decompile | Dekompilator wchodzi w hang lub flooduje stdout/stderr. | Zajecie workerow, degradacja systemu. | Timeout bounds `5000..300000`, default 60s, graceful->force kill, ring buffer limit, retry tylko dla transient. | `SEC-D-01`: sztuczny hang -> `PIPELINE_DECOMP_TIMEOUT` + bounded cleanup; `SEC-D-02`: ogromny output nie powoduje OOM, tylko tail capture. |
| D-02 | API/idempotency | Flood POST bez idempotency key lub z key reuse collision. | Kolejka jobow puchnie, lock contention. | Wymagany `Idempotency-Key`, `PIPELINE_IDEMPOTENCY_KEY_REQUIRED/REUSED`, rate/backpressure code `PIPELINE_RATE_LIMITED`, bounded attempts. | `SEC-D-03`: brak key -> `422`; `SEC-D-04`: ten sam key + inny payload -> `409`; `SEC-D-05`: load test rate limit + retry semantics. |
| D-03 | blob ingest | Powtarzane te same joby generuja nadmiar uploadu i write amplification. | Nadmierny koszt I/O i storage. | `job_key` idempotency, `blob_key=sha256`, sync plan dedupe, no-op commit rules (brak side writes). | `SEC-D-06`: re-run identycznego joba nie tworzy nowych blobow; `SEC-D-07`: no-op nie zmienia `latest` i nie wykonuje write path. |

## 3.6 Elevation of Privilege

| ID | Stage | Scenariusz | Impact | Kontrole | Testy bezpieczenstwa |
|---|---|---|---|---|---|
| E-01 | API runtime settings | Uzytkownik z nizsza rola eskaluje uprawnienia do path write. | Przejecie kontroli nad zrodlem danych i host FS read scope. | Split permissions (`admin.config.write` + `admin.runtime_paths.write`), hard role checks, mutation tests dla guard/policy. | `SEC-E-01`: matrix role->permission dla PUT runtime; `SEC-E-02`: mutation test ubija oslabione guardy. |
| E-02 | apply/API write boundary | Obejscie revision gate (`expectedRevision`) lub apply bez wymaganych permissions. | Nieautoryzowany write i stale overwrite. | `expectedRevision` required on mutating apply, `PIPELINE_APPLY_REVISION_CONFLICT`, per-type permissions (`asset.place`, `dm.spawn_creature`). | `SEC-E-03`: brak `expectedRevision` -> reject; `SEC-E-04`: stale revision -> `409`; `SEC-E-05`: rola read-only nie moze apply. |
| E-03 | filesystem boundary | Lokalny attacker podmienia symlink po walidacji (TOCTOU) i eskaluje read scope. | Odczyt plikow poza allowlist, potencjalny credential leak. | TOCTOU guard (re-verify after open), `path_security_toctou_detected`, host ACL least privilege. | `SEC-E-06`: symlink swap podczas open -> fail + telemetry event; `SEC-E-07`: process account nie ma read poza root allowlist. |

## 4. Kontrole bazowe (R63) i rozszerzenia R65

## 4.1 Kontrole bazowe (MUST z R63)
1. Path security contract: canonicalization, allowlist roots, symlink policy, TOCTOU guard, fail-fast.
2. Deterministic source selection: `moduleDecompiledPath` ma priorytet nad `modulePackedPath`.
3. Decompiler contract: timeout + bounded logs + deterministic exit-code mapping.
4. Blob ingest contract: CAS blobs, immutable commits, revision-gated `latest`, restart-safe checkpoints.
5. API contract: mandatory idempotency on mutating POST, stable error envelope, RBAC per endpoint.
6. Observability contract: required lifecycle/stage/retry/revision events + low-cardinality metrics.

## 4.2 Rozszerzenia R65 (security-focused)
1. Wydzielic permission `admin.runtime_paths.write` dla zmian path fields.
2. Dodac mandatory security regression suite `SEC-*` dla kazdego STRIDE scenariusza z sekcji 3.
3. Dodac explicit secret/path redaction assertions do pipeline log tests.
4. Wlaczyc chaos tests dla lease/race/restart i TOCTOU swap.

## 5. Security test matrix i gate r64

## 5.1 Test suites (minimalny zestaw)
1. `SEC-PATH-*` (unit+integration): traversal, absolute escape, symlink/junction, TOCTOU.
2. `SEC-DECOMP-*` (integration): timeout kill, malformed JSON, output contract, stdout/stderr bounds.
3. `SEC-STAGE-*` (integration): artifact tampering, manifest hash mismatch.
4. `SEC-BLOB-*` (integration/e2e): CAS dedupe, immutable commit, revision conflicts, no-op write suppression.
5. `SEC-API-*` (e2e): authz matrix, idempotency abuse, apply revision gate.
6. `SEC-OBS-*` (integration): required events present, forbidden labels absent, audit completeness.

## 5.2 Verify gates wg r64
1. `P0` (kazdy PR):
```bash
cd backend
npm run build
npm run test:unit
npm run test:e2e
```
2. `P1` (zmiany logic/auth/guard/policy):
```bash
cd backend
npm run build
npm run test:unit
npm run test:e2e
npm run test:mutation
```
3. `P2` (release/hardening sign-off):
```bash
cd backend
npm run build
npm run test:unit
npm run test:e2e
npm run test:mutation
```

Wymaganie R65:
1. Zmiany dotykajace kontroli security z sekcji 4 automatycznie klasyfikowac co najmniej do `P1`.
2. Finalny security hardening dla tego pipeline przechodzi przez `P2`.

## 6. Residual risk i decyzje operacyjne

1. Ryzyko pozostale: kompromitacja hosta z uprawnieniami systemowymi poza zakresem RBAC aplikacji.
2. Ryzyko pozostale: supply-chain decompiler binary (wymaga oddzielnego procesu signed-binary validation).
3. Ryzyko pozostale: polityka retention dla idempotency store i artifacts moze byc targetem storage exhaustion.

Decyzje operacyjne:
1. Traktowac `RUNTIME_PATH_*`, `PIPELINE_DECOMP_*`, `PIPELINE_APPLY_REVISION_CONFLICT`, `PIPELINE_RETRY_EXHAUSTED` jako alertowane sygnaly security/availability.
2. Escalowac incydent, gdy pojawia sie `path_security_toctou_detected` lub seria `pipeline.revision_gate.conflict_detected`.

## 7. Exit criteria dla R65

Threat model jest uznany za wdrozony, gdy:
1. Wszystkie scenariusze `SEC-*` z sekcji 3 sa pokryte testami automatycznymi.
2. Pipeline telemetry spelnia required events/metrics z R63 observability taxonomy.
3. Dla zmian security-sensitive stosowany jest gate `P1` lub `P2` zgodnie z r64.
4. Brak otwartych `P0/P1` luk dla STRIDE scenariuszy S/T/R/I/D/E w tym pipeline.
