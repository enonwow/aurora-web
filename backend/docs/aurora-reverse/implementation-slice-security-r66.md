# Implementation Slice 4: Security Controls Plan R66 (Agent E4)

Data: 2026-05-24
Status: Draft (implementation planning)
Zakres: plan wdrozenia security controls do backlogu kodowego dla:
1. path hardening,
2. authz partition rules,
3. permission checks,
4. threat-model mitigations.

## 1. Cel i wynik

Celem jest domkniecie security gap miedzy kontraktami R63-R65 a implementacja backendu, tak aby:
1. wszystkie sciezki runtime i pipeline byly canonical, allowlisted i fail-fast,
2. read/write API egzekwowalo podzial partycji i least privilege,
3. mutacje byly chronione przez precyzyjne permission checks i revision/idempotency gates,
4. zagrozenia STRIDE mialy mapowanie na kontrole kodowe + testy regresji security.

Wynik koncowy: gotowy backlog implementacyjny (R66) z kolejnoscia, DoD, testami i kryteriami wyjscia.

## 2. Wejscia i zaleznosci (source of truth)

Plan opiera sie na:
1. `path-security-hardening-spec-r63.md`,
2. `access-partition-rules-spec-r63.md`,
3. `admin-runtime-settings-contract-spec-r63.md`,
4. `processing-api-shape-spec-r63.md`,
5. `processing-error-taxonomy-spec-r63.md`,
6. `threat-model-decompile-blob-pipeline-r65.md`,
7. `implementation-backlog-r64.md`,
8. `decision-test-gate-standard-r64.md`.

## 3. Scope wdrozenia (R66)

### 3.1 In-scope
1. Runtime settings path controls (`moduleDecompiledPath`, `modulePackedPath`, `hakDirectoryPath`, `hakProfiles`, `hakPriorityList`).
2. Authz partition rules na endpointach odczytu i mutacji processing API.
3. Permission split dla operacji high-risk (path writes, apply/cancel/retry/delete).
4. STRIDE mitigations dla pipeline decompile->staging->blob ingest->API.
5. Security telemetry, audit trail, error mapping i test gates.

### 3.2 Out-of-scope
1. Zmiany UX/UI panelu admin.
2. Fizyczny/network hardening hosta poza wymaganymi ACL procesu.
3. Redesign domeny processing poza wymaganiami security.

## 4. Backlog implementacyjny (kolejnosc realizacji)

## 4.1 SEC-01: Shared Path Security Guard (foundation)
Zakres:
1. Wydzielic wspolny komponent `PathSecurityGuard` dla canonicalizacji i walidacji sciezek.
2. Wdrozyc reguly: trim, reject control chars/NUL, resolve+realpath, allowlist roots, traversal deny, UNC policy, symlink policy.
3. Dodac helper `isWithinAllowedRoot(canonicalPath, canonicalRoot[])` oraz typed reason codes.

Definition of Done:
1. Jedna implementacja guarda jest wspoluzywana przez runtime settings i pipeline path-open flows.
2. Kazde naruszenie zwraca stabilny kod domenowy `RUNTIME_PATH_*` i `retryable=false`.
3. Brak fallbackow "best effort" przy naruszeniu policy.

Testy:
1. Unit: traversal (`../`), absolute escape, mixed separators, UNC deny, control chars.
2. Integration: canonical compare dla Windows-style paths, case-insensitive edge cases.

## 4.2 SEC-02: Runtime Settings Path Hardening (write + bootstrap)
Zakres:
1. Podlaczyc `PathSecurityGuard` do `PUT /api/v1/settings/runtime`.
2. Wymusic bootstrap fail-fast, gdy aktywna konfiguracja path nie przechodzi security policy.
3. Ujednolicic policy dla `resolveHakPath` i endpointu `haks/resolved` (zwraca tylko canonical validated paths).

Definition of Done:
1. `PUT` odrzuca niebezpieczne wpisy kodami:
   `RUNTIME_PATH_INVALID_FORMAT`,
   `RUNTIME_PATH_TRAVERSAL_DETECTED`,
   `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`,
   `RUNTIME_PATH_SYMLINK_FORBIDDEN`,
   `RUNTIME_HAK_ABSOLUTE_ENTRY_FORBIDDEN`.
2. Startup backendu failuje kontrolowanie z `RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED` dla niezgodnej konfiguracji.
3. Brak mozliwosci implicit relative fallback do `process.cwd()` poza explicit approved roots.

Testy:
1. E2E: matrix blednych payloadow `PUT /settings/runtime`.
2. Integration: bootstrap z poprawna i bledna konfiguracja.

## 4.3 SEC-03: TOCTOU + Secure Open Guard dla path-dependent reads
Zakres:
1. Dodac wzorzec "validate -> open read-only -> post-open reverify" dla odczytu plikow modulu/HAK.
2. Emisja eventu `path_security_toctou_detected` przy mismatch.
3. Zabezpieczyc extraction/decompile entry points, aby zawsze przechodzily przez secure-open flow.

Definition of Done:
1. Odczyt pliku poza allowlist przez symlink swap jest blokowany.
2. Mismatch po open mapowany na kod fatalny security i telemetry event.
3. Brak bezposrednich `fs` open/read w krytycznych adapterach bez guarda.

Testy:
1. Integration/chaos: symulacja symlink swap podczas open.
2. Regression: legal path open dziala bez regresji funkcjonalnej.

## 4.4 SEC-04: AuthZ Partition Rules Enforcement (read paths)
Zakres:
1. Zaimplementowac centralny partition filter dla list/status/preview endpoints.
2. Egzekwowac ograniczenia ownership/visibility/securityLabel zgodnie z kontraktem access partition.
3. Ujednolicic zachowanie deny (brak ujawniania obcych rekordow, stable 403/404 policy wg spec).

Definition of Done:
1. Wszystkie read endpointy processing korzystaja z jednego policy layer.
2. Brak cross-partition data leak w payloadach, countach i metadata.
3. Deterministyczne envelope errors bez wycieku obcej tozsamosci joba.

Testy:
1. E2E: role x partition matrix (same tenant, other tenant, no access).
2. Security regression: enumeration attempts na `jobId`, `dataset`, `revision`.

## 4.5 SEC-05: Permission Matrix Hardening (mutating endpoints)
Zakres:
1. Rozdzielic i wyegzekwowac permissiony:
   `admin.config.write`,
   `admin.runtime_paths.write`,
   `asset.place`,
   `dm.spawn_creature`,
   oraz mutacje lifecycle (`cancel`, `retry`, `delete`).
2. Wymusic `Idempotency-Key` dla mutujacych POST.
3. Wymusic `expectedRevision` dla apply/write boundary.

Definition of Done:
1. Kazdy mutujacy endpoint ma jawna policy declaration i testowalny guard.
2. Brak mozliwosci write bez wymaganej permission nawet przy poprawnej roli bazowej.
3. Brak apply przy stale/missing revision (`409` / canonical code).

Testy:
1. E2E: permission matrix (allow/deny).
2. Mutation tests: oslabienie guarda powoduje fail zestawu.

## 4.6 SEC-06: Threat-Model Mitigations in Pipeline (STRIDE mapping)
Zakres:
1. Spiac implementacje kontroli z zagrozeniami `S/T/R/I/D/E` z modelu R65.
2. Dla decompilera: timeout bounds, graceful/force kill, bounded stdout/stderr tails.
3. Dla blob ingest: immutable keys, revision gate, conflict handling, no-op write suppression.
4. Dla idempotencji/DoS: payload hash checks i retry bounds.

Definition of Done:
1. Kazda kontrola STRIDE ma wlaczona implementacje i mapowanie do eventow/kodow bledow.
2. Retry semantics zgodne z `retryable` i bounded attempts.
3. Konflikty revision/idempotency sa deterministyczne i audytowalne.

Testy:
1. `SEC-S-*`, `SEC-T-*`, `SEC-D-*`, `SEC-E-*` zgodnie z threat-model R65.
2. Chaos/restart tests dla lease takeover i checkpoint resume.

## 4.7 SEC-07: Audit, Telemetry, and Log Hygiene
Zakres:
1. Wymagane eventy security:
   `runtime_paths_changed`,
   `path_security_validation_failed`,
   `path_security_escape_blocked`,
   `path_security_symlink_blocked`,
   `path_security_toctou_detected`.
2. Redaction polityk dla logow i details payloads (bez sekretow/high-risk raw paths).
3. Correlation przez `requestId`, `jobId`, `jobKey`, `attempt`.

Definition of Done:
1. Kazda mutacja high-risk ma audit trail (`updatedBy`, changed fields, revision, timestamp).
2. Metryki pozostaja low-cardinality i bez zabronionych labels.
3. Log tails sa ograniczone rozmiarem i nie leakuja sekretow.

Testy:
1. Integration: event presence contract.
2. Security scan test: brak token/secret leak pattern w logs/details.

## 4.8 SEC-08: Host-Level Permission Profile i deployment guardrails
Zakres:
1. Zdefiniowac minimalne ACL runtime usera:
   read-only do allowed roots,
   write tylko do config/work dirs/staging temp.
2. Dodac startup self-check (best-effort diagnostics) ostrzegajacy o overbroad write access.
3. Uzgodnic rollout notes dla ops runbook.

Definition of Done:
1. Profil uprawnien hosta jest opisany i przypiety do deployment checklist.
2. Brak wymagan write do katalogow source content podczas standardowego runu.
3. Incident runbook zawiera akcje dla path security alerts.

Testy:
1. Manual verification checklist + automatyczny smoke check startup diagnostics.
2. Negative test: brak read permission do root -> czytelny blad bootstrap.

## 4.9 SEC-09: Security Regression Suite + CI Gates
Zakres:
1. Zorganizowac suite `SEC-*` (path/authz/permission/threat) jako staly gate.
2. Podpiac klasyfikacje gate:
   `P0` standard,
   `P1` dla zmian guard/policy/auth,
   `P2` dla sign-off security release.
3. Dodac raport pokrycia scenariuszy security do CI artefaktow.

Definition of Done:
1. PR dotykajacy security controls nie przechodzi bez `P1`.
2. Release branch security nie przechodzi bez `P2`.
3. Widoczny raport mapujacy testy `SEC-*` -> kontrole -> zagrozenia.

Testy:
1. CI dry run i wymuszenie fail przy celowym oslabieniu guarda.
2. Mutation coverage dla authz/permission guardow.

## 5. Priorytety i fazowanie

## 5.1 Faza A (must-have, blokuje dalsze warstwy)
1. `SEC-01`, `SEC-02`, `SEC-03`, `SEC-05`.

## 5.2 Faza B (egzekucja end-to-end security boundary)
1. `SEC-04`, `SEC-06`, `SEC-07`.

## 5.3 Faza C (operacjonalizacja i governance)
1. `SEC-08`, `SEC-09`.

## 6. Ryzyka wdrozeniowe i mitigacje

1. Ryzyko: regresja kompatybilnosci starych konfiguracji path.
Mitigacja: feature flag `pathSecurity.enforce`, rollout etapowy, migration dry-run report.

2. Ryzyko: false positives na symlink policy w srodowiskach legacy.
Mitigacja: tryb przejsciowy `allow_inside_root` z telemetry, plan przejscia na `deny`.

3. Ryzyko: niedokladna macierz uprawnien i blokada legalnych operacji.
Mitigacja: explicit permission matrix tests + staged rollout + audit review.

4. Ryzyko: wzrost czasu CI przez SEC suites.
Mitigacja: podzial na szybkie smoke security (`P0`) i pelne suites (`P1/P2`) z rownolegla egzekucja.

## 7. Exit criteria dla Slice 4 (R66)

Slice 4 uznajemy za domkniety, gdy:
1. Wszystkie pozycje `SEC-01..SEC-09` maja status Done i spelnione DoD.
2. Security test matrix `SEC-*` przechodzi stabilnie na CI wg gate `P1/P2`.
3. Brak otwartych luk `P0/P1` dla kategorii: path escape, cross-partition leak, missing permission guard, TOCTOU.
4. Audit + telemetry potwierdzaja wykrywalnosc i rozliczalnosc operacji high-risk.
5. Ops runbook zawiera aktywne procedury dla alertow `RUNTIME_PATH_*`, `path_security_toctou_detected`, `revision_conflict`.


