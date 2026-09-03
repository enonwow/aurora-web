# PR Readiness Checklist (R70): First 3 Implementation PRs

Data: 2026-05-24  
Zakres: PR-1, PR-2, PR-3 zgodnie z `execution-plan-first-3-prs-r68.md` i `pr-dependency-graph-r69.md`.

## Global prerequisites (wszystkie PR-y)

- [ ] Zachowana kolejnosc merge: `PR-1 -> PR-2 -> PR-3`.
- [ ] Brak rownoleglego merge do tych samych plikow.
- [ ] Gate `P0` zaliczony: `npm run build`, `npm run test:unit`, `npm run test:e2e` (uruchamiane z `backend/`).
- [ ] Dla zmian logic/auth/guard/policy zaliczone są właściwe skupione testy unit/security/integration; mutation testing pozostaje opcjonalne i wymaga wyraźnego żądania użytkownika.

## PR-1: Runtime Settings Security Foundation

### Definition of Ready

- [ ] Scope ograniczony do runtime-settings + auth policy (bez zmian URL endpointow).
- [ ] Potwierdzone wymagania: `pathSecurity`, canonicalizacja/walidacja path, fail-fast na bootstrap i `PUT /settings/runtime`.
- [ ] Potwierdzony split uprawnienia `admin.runtime_paths.write` oraz audit event `runtime_paths_changed`.
- [ ] Brak zmian wychodzacych poza target files z planu R68.

### Required tests

- [ ] Unit: `runtime-settings.schemas`, `runtime-settings.application.service`, `runtime-settings-bootstrap.service`, `runtime-settings-path-security.service`, `auth.policy`.
- [ ] E2E: `runtime-settings.e2e-spec`, `runtime-settings.security.e2e-spec`.
- [ ] Gate `P0` zaliczony.
- [ ] Skupione negatywne testy security/auth/policy zaliczone.

### Artifacts

- [ ] Log/raport z `build`, `test:unit`, `test:e2e` i właściwych skupionych testów security.
- [ ] Dowod fail-fast: przypadek niezgodnej konfiguracji blokuje bootstrap z kodem `RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`.
- [ ] Dowod autoryzacji: przypadek 403 bez `admin.runtime_paths.write` oraz pozytywny przypadek z uprawnieniem.
- [ ] Dowod audytu: wpis `runtime_paths_changed` dla mutacji path-sensitive.

### Rollback notes

- [ ] Plan rollback: `git revert` calego PR (single revert commit).
- [ ] Fallback operacyjny: tymczasowo `pathSecurity.enforce=false` do czasu poprawki.
- [ ] Fallback uprawnien: tymczasowe dopisanie `admin.runtime_paths.write` do roli admin (jesli rollout powoduje 403).
- [ ] Kryterium cofniecia: wzrost `RUNTIME_PATH_*` lub startup block na produkcji.

### Reviewer handoff

- [ ] Krotki opis zmian + mapowanie na ADR-66-02 / Slice 1 i 4.
- [ ] Lista ryzyk do sprawdzenia przez review: drift kontraktu runtime settings, semantyka `auth.policy.ts`.
- [ ] Potwierdzenie, ze PR-3 nie powiela zmian z `auth.policy.ts`.
- [ ] Wskazanie ownera security review i ownera testow e2e.

## PR-2: Source Resolver Core (Deterministic + Module-Bound)

### Definition of Ready

- [ ] Scope ograniczony do nowego modulu `processing/source-resolver`.
- [ ] Brak publicznych endpointow i brak zmian DB.
- [ ] Potwierdzona polityka: `ARE/GIT` module-bound, pelny chain dla pozostalych typow.
- [ ] Potwierdzona deterministyka winnera (tie-break i stable remisy).

### Required tests

- [ ] Unit: `source-resolver.service`, `hak-priority-sorter`.
- [ ] Integration: `source-catalog.integration`.
- [ ] Contract: `source-diagnostics.contract`.
- [ ] Gate `P0` zaliczony (`build`, `unit`, `e2e` smoke).

### Artifacts

- [ ] Log/raport z `build`, `test:unit`, `test:e2e`.
- [ ] Wyniki testow deterministycznych (powtarzalny winner dla tych samych danych).
- [ ] Dowody diagnostics: `SOURCE_RESOLVE_MISS`, `SOURCE_LAYER_BLOCKED`, `SOURCE_TIEBREAK_APPLIED`, `SOURCE_POLICY_VIOLATION`.
- [ ] Potwierdzenie "no API/no DB changes" (diff summary).

### Rollback notes

- [ ] Plan rollback: `git revert` calego PR (modul izolowany).
- [ ] Alternatywa: revert tylko PR-2 przy ryzyku driftu policy `ARE/GIT`.
- [ ] Kryterium cofniecia: non-determinism lub falszywe resolution dla `ARE/GIT`.

### Reviewer handoff

- [ ] Krotki opis zmian + mapowanie na ADR-66-01 / Slice 2.
- [ ] Sekcja "out of scope" jawnie wskazuje brak zmian API/DB.
- [ ] Lista ryzyk rebase: potencjalna kolizja architektoniczna przy podpinaniu processing (weryfikacja przed PR-3).
- [ ] Wskazanie ownera review dla logiki policy i deterministycznego sortowania.

## PR-3: Processing API + Jobs Foundation

### Definition of Ready

- [ ] PR-2 jest zmergowany; PR-3 zrebasowany na aktualny target branch.
- [ ] Scope obejmuje tylko minimalny pion API/jobs + DB + podpiecie `ProcessingModule` do `AppModule`.
- [ ] Potwierdzone elementy: enqueue/status/cancel/retry, idempotency store, state machine `status+phase`, retry policy.
- [ ] Publiczny envelope i kody `PIPELINE_*` zgodne z kontraktami.

### Required tests

- [ ] Unit: `job-status.state-machine`, `retry.policy`.
- [ ] Integration: `idempotency-store.integration`, `retry-exhausted.integration`.
- [ ] E2E: `processing-api.e2e-spec`, `processing-jobs.e2e-spec`.
- [ ] Gate `P0` zaliczony.
- [ ] Skupione testy lifecycle/idempotency/guards zaliczone.

### Artifacts

- [ ] Log/raport z `build`, `test:unit`, `test:e2e` i właściwych skupionych testów lifecycle/idempotency/guards.
- [ ] Dowody idempotencji: replay request nie tworzy duplikatow jobow.
- [ ] Dowody state machine: poprawne przejscia atomowe i oczekiwane konflikty.
- [ ] Dowody endpointow: przykladowe request/response dla enqueue/status/cancel/retry (z kodami `PIPELINE_*`).
- [ ] Dowod startupu aplikacji po podpieciu `ProcessingModule`.

### Rollback notes

- [ ] Plan rollback: `git revert` PR-3.
- [ ] Feature flag dla endpointow processing (domyslnie off na prod do czasu pelnej walidacji).
- [ ] Strategia DB rollback: przy migracjach additive zostawic tabele, wylaczyc routing endpointow.
- [ ] Nie usuwac danych jobs/idempotency w trybie awaryjnym (audit trail).
- [ ] Kryterium cofniecia: konflikty stanu `PIPELINE_JOB_STATE_CONFLICT`, duplikacja jobow, problemy startupu.

### Reviewer handoff

- [ ] Krotki opis zmian + mapowanie na ADR-66-05/66-06 / Slice 3.
- [ ] Wyodrebniona sekcja ryzyk: `app.module.ts`, `database/schema.ts`, semantyka lifecycle/idempotency.
- [ ] Potwierdzenie, ze konflikty merge byly rozwiazywane tylko w plikach uzgodnionych dla PR-3.
- [ ] Wskazanie ownera review dla API contract, DB schema i operacyjnego rolloutu.
