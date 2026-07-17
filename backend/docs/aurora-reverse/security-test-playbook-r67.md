# Security Test Playbook R67 (Agent E5)

Data: 2026-05-24
Wejscia: `implementation-slice-security-r66.md`, `threat-model-decompile-blob-pipeline-r65.md`
Zakres: playbook testow bezpieczenstwa dla pipeline `module path -> decompile -> staging -> blob ingest -> API`.

## 1. Cel playbooka

1. Zdefiniowac wykonywalny zestaw testow bezpieczenstwa dla kontroli z R66 i zagrozen STRIDE z R65.
2. Ujednolicic oczekiwane rezultaty (kody, eventy, zachowania fail-fast).
3. Ustalic priorytet automatyzacji i minimalny gate (`P0/P1/P2`) dla kazdego przypadku.

## 2. Skala priorytetu automatyzacji

1. `A0-CRITICAL`: automatyzacja wymagana natychmiast, test blokuje merge/release.
2. `A1-HIGH`: automatyzacja wymagana w biezacej iteracji security.
3. `A2-MEDIUM`: automatyzacja planowana po domknieciu A0/A1, dopuszczalnie manual tymczasowo.
4. `A3-LOW`: test glownie manualny/operacyjny, automatyzacja opcjonalna.

## 3. Format wykonania testu

Kazdy test zawiera:
1. `ID`.
2. `Obszar` (SEC-xx + STRIDE).
3. `Test case`.
4. `Expected result`.
5. `Automation priority`.
6. `Gate` (`P0/P1/P2`).

## 4. Test cases

| ID | Obszar | Test case | Expected result | Automation priority | Gate |
|---|---|---|---|---|---|
| R67-SEC-PATH-01 | SEC-01, T-01 | `PUT /api/v1/settings/runtime` z `hakProfiles` zawierajacym `../hak/file.hak`. | `422`, kod `RUNTIME_PATH_TRAVERSAL_DETECTED`, `retryable=false`, event `path_security_validation_failed`. | A0-CRITICAL | P1 |
| R67-SEC-PATH-02 | SEC-01/02, T-01 | `PUT /settings/runtime` z absolutna sciezka poza allowlist root. | `422`, `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`, brak fallback do `process.cwd()`. | A0-CRITICAL | P1 |
| R67-SEC-PATH-03 | SEC-01/02, T-01 | Runtime path z control char/NUL (`\0`, ascii control). | `422`, `RUNTIME_PATH_INVALID_FORMAT`, walidacja fail-fast. | A1-HIGH | P1 |
| R67-SEC-PATH-04 | SEC-01/02, T-01 | HAK absolute entry w payloadzie runtime settings. | `422`, `RUNTIME_HAK_ABSOLUTE_ENTRY_FORBIDDEN`. | A1-HIGH | P1 |
| R67-SEC-PATH-05 | SEC-01/02, T-01 | Symlink/junction wskazujacy poza allowlist root. | `422`, `RUNTIME_PATH_SYMLINK_FORBIDDEN` lub `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`; event `path_security_symlink_blocked`. | A0-CRITICAL | P1 |
| R67-SEC-PATH-06 | SEC-02 | Bootstrap backendu na niezgodnej konfiguracji path. | Start zatrzymany, blad `RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`, brak uruchomienia API. | A0-CRITICAL | P1 |
| R67-SEC-PATH-07 | SEC-03, E-03 | TOCTOU: symlink swap miedzy validate i open. | Odczyt zablokowany, event `path_security_toctou_detected`, blad security fatal/non-retryable. | A0-CRITICAL | P1 |
| R67-SEC-PATH-08 | SEC-03 | Legalny canonical path open/read bez ataku. | Sukces odczytu, brak false positive telemetry security. | A1-HIGH | P1 |
| R67-SEC-AUTH-01 | SEC-04, I-02 | GET status/list dla tenant A probuje odczytac job tenant B (jobId enumeration). | `403` lub `404` wg policy, brak wycieku metadata/identity obcego joba. | A0-CRITICAL | P1 |
| R67-SEC-AUTH-02 | SEC-04, I-02 | GET preview dla roli bez `asset.preview`. | `403`, stabilny error envelope, bez danych preview. | A0-CRITICAL | P1 |
| R67-SEC-AUTH-03 | SEC-04 | Cross-partition matrix (same tenant, other tenant, no access) dla list/status/preview. | Tylko rekordy dozwolone przez ownership/visibility/securityLabel; county i metadata bez leakow. | A0-CRITICAL | P1 |
| R67-SEC-AUTH-04 | SEC-04 | Query po `dataset`/`revision` spoza partycji. | Brak danych obcych partycji, deterministyczne deny semantics. | A1-HIGH | P1 |
| R67-SEC-PERM-01 | SEC-05, S-01/E-01 | `PUT /settings/runtime` bez tokenu. | `401` unauthorized. | A0-CRITICAL | P0 |
| R67-SEC-PERM-02 | SEC-05, S-01/E-01 | `PUT /settings/runtime` z rola admin bez `admin.runtime_paths.write`. | `403`, kod `FORBIDDEN_PERMISSION`. | A0-CRITICAL | P1 |
| R67-SEC-PERM-03 | SEC-05, E-01 | Matrix `admin.config.write` vs `admin.runtime_paths.write` dla mutacji path fields. | Tylko podmiot z oboma wymaganymi guardami przechodzi wg polityki endpointu. | A0-CRITICAL | P1 |
| R67-SEC-PERM-04 | SEC-05, D-02 | Mutujacy POST bez `Idempotency-Key`. | `422`, `PIPELINE_IDEMPOTENCY_KEY_REQUIRED`. | A0-CRITICAL | P0 |
| R67-SEC-PERM-05 | SEC-05, D-02 | Ten sam `Idempotency-Key`, inny payload. | `409`, `PIPELINE_IDEMPOTENCY_KEY_REUSED` (lub rownowazny canonical code), brak nowego joba. | A0-CRITICAL | P1 |
| R67-SEC-PERM-06 | SEC-05, E-02 | Apply/mutacja bez `expectedRevision`. | Reject (`409` lub canonical reject), brak write side effect. | A0-CRITICAL | P1 |
| R67-SEC-PERM-07 | SEC-05, E-02 | Apply z nieaktualnym `expectedRevision`. | `409`, `PIPELINE_APPLY_REVISION_CONFLICT`, brak commit/latest update. | A0-CRITICAL | P1 |
| R67-SEC-PERM-08 | SEC-05 | Lifecycle mutacje `cancel/retry/delete` bez dedykowanej permission. | `403` dla kazdej zabronionej mutacji, brak stanu ubocznego. | A0-CRITICAL | P1 |
| R67-SEC-STRIDE-S-01 | SEC-06, S-02 | Dwa workery jednoczesnie probuja przejac ten sam job. | Jeden lease owner; drugi conflict (`pipeline.source_lock.conflict`), brak podwojnego publish. | A1-HIGH | P1 |
| R67-SEC-STRIDE-S-02 | SEC-06, S-02 | Lease takeover po TTL (controlled failover). | Przejecie tylko po wygasnieciu lease, bez duplikacji commit/latest. | A1-HIGH | P1 |
| R67-SEC-STRIDE-T-01 | SEC-06, T-02 | Tampering artefaktu miedzy decompile a manifest hash. | Hash mismatch, job fail non-retryable, audit trail obecny. | A1-HIGH | P1 |
| R67-SEC-STRIDE-T-02 | SEC-06, T-03 | Probny overwrite immutable `commits/*` lub `cas/*`. | Blokada zapisu/wykrycie konfliktu, brak podmiany snapshotu. | A0-CRITICAL | P1 |
| R67-SEC-STRIDE-T-03 | SEC-06, T-03 | Update `refs/<dataset>/latest.json` ze stale `expected_revision`. | Konflikt revision (`409`/`failed_conflict`), brak zmiany latest. | A0-CRITICAL | P1 |
| R67-SEC-STRIDE-R-01 | SEC-07, R-01 | Zmiana runtime paths i walidacja audit eventu. | `runtime_paths_changed` zawiera `updatedBy`, `revision`, `changed_fields`, `requestId`. | A1-HIGH | P1 |
| R67-SEC-STRIDE-R-02 | SEC-07, R-02 | Operacje `cancel/retry` i sekwencja eventow lifecycle. | Eventy `pipeline.job.cancel_requested`, `pipeline.retry.scheduled/exhausted`, stan zgodny ze state machine. | A1-HIGH | P1 |
| R67-SEC-STRIDE-I-01 | SEC-07, I-01 | Skan log tails i details pod sekret/token/full raw path leak. | Brak wzorcow sekretow, redaction aktywna, tails ograniczone (ring limit). | A0-CRITICAL | P1 |
| R67-SEC-STRIDE-I-02 | SEC-07, I-01 | Walidacja metryk pod zakazane high-cardinality labels. | Brak labeli typu `sourcePath`/raw details/token. | A1-HIGH | P1 |
| R67-SEC-STRIDE-D-01 | SEC-06, D-01 | Decompiler hang > timeout. | `PIPELINE_DECOMP_TIMEOUT`, graceful->force kill, cleanup bounded. | A0-CRITICAL | P1 |
| R67-SEC-STRIDE-D-02 | SEC-06, D-01 | Flood stdout/stderr od decompilera. | Brak OOM; capture tylko bounded tail, job zakonczony kontrolowanie. | A1-HIGH | P1 |
| R67-SEC-STRIDE-D-03 | SEC-06, D-02 | Rate-limit/backpressure przy flood POST. | Odpowiedz `PIPELINE_RATE_LIMITED` (lub canonical), retry semantics bounded. | A1-HIGH | P2 |
| R67-SEC-STRIDE-D-04 | SEC-06, D-03 | Re-run identycznego joba wielokrotnie. | Dedupe: brak nowych blobow, no-op write suppression, brak zmiany latest przy no-op. | A1-HIGH | P1 |
| R67-SEC-STRIDE-E-01 | SEC-05/06, E-02 | Rola read-only probuje apply (`asset.place`/`dm.spawn_creature`). | `403`, brak write side effect. | A0-CRITICAL | P1 |
| R67-SEC-STRIDE-E-02 | SEC-03/08, E-03 | Konto procesu bez read poza allowlist root. | Odczyt poza root zablokowany przez ACL/OS; czytelny blad diagnostyczny. | A2-MEDIUM | P2 |
| R67-SEC-OBS-01 | SEC-07 | Presence contract eventow: `runtime_paths_changed`, `path_security_validation_failed`, `path_security_escape_blocked`, `path_security_symlink_blocked`, `path_security_toctou_detected`. | Wszystkie eventy emitowane w odpowiednich scenariuszach, pola korelacji kompletne (`requestId`, `jobId`, `jobKey`, `attempt`). | A1-HIGH | P1 |
| R67-SEC-HOST-01 | SEC-08 | Startup self-check wykrywa overbroad write access runtime usera. | Ostrzezenie diagnostyczne obecne, brak silent pass. | A2-MEDIUM | P2 |
| R67-SEC-HOST-02 | SEC-08 | Brak read permission do wymaganego root podczas bootstrap. | Kontrolowany blad bootstrap z czytelnym komunikatem i code mappingiem. | A2-MEDIUM | P2 |
| R67-SEC-CI-01 | SEC-09 | Celowe oslabienie guarda path/authz i uruchomienie suite security. | Pipeline CI fail na `P1`; raport wskazuje testy, ktore zlapaly regresje. | A0-CRITICAL | P1 |
| R67-SEC-CI-02 | SEC-09 | Security release sign-off z pelnym zestawem suites. | `P2` przechodzi tylko przy braku otwartych `P0/P1` findings. | A1-HIGH | P2 |

## 5. Priorytety automatyzacji wg etapu

1. Etap 1 (natychmiast): wszystkie `A0-CRITICAL`.
2. Etap 2: wszystkie `A1-HIGH`.
3. Etap 3: `A2-MEDIUM` oraz utrzymanie testow operacyjnych.
4. Etap 4: `A3-LOW` wedlug koszt/ryzyko (obecnie brak pozycji krytycznych w tej klasie).

## 6. Minimalny zestaw gate execution

1. `P0`:
   1. smoke security dla auth/idempotency (`R67-SEC-PERM-01`, `R67-SEC-PERM-04`) + podstawowe unit.
2. `P1`:
   1. komplet A0 + A1 dla path/authz/permission/STRIDE + mutation tests guardow.
3. `P2`:
   1. komplet P1 + testy chaos/host/operacyjne (`R67-SEC-STRIDE-D-03`, `R67-SEC-STRIDE-E-02`, `R67-SEC-HOST-*`) oraz sign-off release.

## 7. Kryteria akceptacji R67

1. Kazdy test `A0-CRITICAL` jest zautomatyzowany i uruchamiany co najmniej w `P1` (lub `P0`, gdzie wskazano).
2. Mapowanie R66 SEC-01..SEC-09 do przypadkow testowych jest pelne (brak luk).
3. Mapowanie STRIDE S/T/R/I/D/E z R65 ma przypisane testy i jednoznaczny expected result.
4. CI publikuje raport `test -> control -> threat` dla suites security.
